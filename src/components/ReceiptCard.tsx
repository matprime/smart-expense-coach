import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Store, Trash2, Tag, Edit2, Check, X, Plus, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import type { Receipt, Category, Expense } from '@/types';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ReceiptCardProps {
  receipt: Receipt;
  onDelete?: (receiptId: string) => void;
  onUpdate?: () => void;
}

export function ReceiptCard({ receipt, onDelete, onUpdate }: ReceiptCardProps) {
  const [open, setOpen] = React.useState(false);
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = React.useState(false);
  const [editingExpenses, setEditingExpenses] = React.useState<Expense[]>([]);
  const [editingVendor, setEditingVendor] = React.useState(receipt.vendor || '');
  const [editingDate, setEditingDate] = React.useState(receipt.date || '');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isReprocessing, setIsReprocessing] = React.useState(false);

  React.useEffect(() => {
    setEditingVendor(receipt.vendor || '');
    setEditingDate(receipt.date || '');
  }, [receipt]);

  const isUnprocessed = !receipt.raw_text && !receipt.vendor && !receipt.total_amount;

  const handleReprocess = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsReprocessing(true);
    toast.info('Re-processing receipt with OCR...');
    try {
      const { data, error } = await supabase.functions.invoke('process-receipt', {
        body: { imageUrl: receipt.image_url, receiptId: receipt.id },
      });
      if (error) {
        const errorMsg = await error?.context?.text().catch(() => error?.message);
        console.error('Re-process OCR error:', errorMsg || error?.message);
        toast.error('OCR processing failed. Please try again.');
      } else {
        toast.success('Receipt processed successfully');
        onUpdate?.();
      }
    } catch (err) {
      console.error('Re-process error:', err);
      toast.error('Failed to re-process receipt');
    } finally {
      setIsReprocessing(false);
    }
  };

  const fetchExpenses = React.useCallback(async () => {
    setLoadingExpenses(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('receipt_id', receipt.id);

      if (error) throw error;
      setExpenses(data || []);
      setEditingExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load receipt items');
    } finally {
      setLoadingExpenses(false);
    }
  }, [receipt.id]);

  React.useEffect(() => {
    if (open) {
      fetchExpenses();
    }
  }, [open, fetchExpenses]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(receipt.id);
  };

  const handleUpdateExpense = (id: string, field: keyof Expense, value: any) => {
    setEditingExpenses(prev =>
      prev.map(exp => (exp.id === id ? { ...exp, [field]: value } : exp))
    );
  };

  const handleAddExpense = () => {
    const newExpense: any = {
      id: `new-${Date.now()}`,
      receipt_id: receipt.id,
      item_name: 'New Item',
      amount: 0,
      category: 'Other',
      usd_amount: 0,
      original_currency: receipt.original_currency || 'USD',
      original_amount: 0,
    };
    setEditingExpenses(prev => [...prev, newExpense]);
  };

  const handleRemoveExpense = (id: string) => {
    setEditingExpenses(prev => prev.filter(exp => exp.id !== id));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const originalIds = expenses.map(e => e.id);
      const remainingIds = editingExpenses.filter(e => !e.id.startsWith('new-')).map(e => e.id);
      const deletedIds = originalIds.filter(id => !remainingIds.includes(id));

      if (deletedIds.length > 0) {
        await supabase.from('expenses').delete().in('id', deletedIds);
      }

      const toUpdate = editingExpenses.filter(e => !e.id.startsWith('new-'));
      const toInsert = editingExpenses.filter(e => e.id.startsWith('new-')).map(({ id, ...rest }) => ({
        ...rest,
        usd_amount: rest.amount,
        original_amount: rest.original_amount || rest.amount,
      }));

      if (toUpdate.length > 0) {
        for (const exp of toUpdate) {
          await supabase.from('expenses').update({
            item_name: exp.item_name,
            amount: exp.amount,
            category: exp.category,
            usd_amount: exp.amount,
            original_amount: exp.original_amount || exp.amount,
          }).eq('id', exp.id);
        }
      }

      if (toInsert.length > 0) {
        await supabase.from('expenses').insert(toInsert.map(e => ({
          ...e,
          usd_amount: e.amount,
          original_amount: e.original_amount || e.amount
        })));
      }

      const newTotalUSD = editingExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const newTotalOriginal = editingExpenses.reduce((sum, e) => sum + Number(e.original_amount || e.amount), 0);
      const newCategory = editingExpenses.length > 0 ? editingExpenses[0].category : 'Other';
      
      await supabase.from('receipts').update({
        vendor: editingVendor || null,
        date: editingDate || null,
        total_amount: newTotalUSD,
        usd_amount: newTotalUSD,
        original_amount: newTotalOriginal,
        category: newCategory,
      }).eq('id', receipt.id);

      toast.success('Changes saved successfully');
      setOpen(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const categories: Category[] = ['Transport', 'Food', 'Groceries', 'Entertainment', 'Other'];
  const primaryCategory = expenses.length > 0 ? expenses[0].category : 'Other';

  // Calculate totals for dialog display
  const calculatedTotalUSD = editingExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const calculatedTotalOriginal = editingExpenses.reduce((sum, e) => sum + Number(e.original_amount || e.amount), 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Card className="h-full group relative overflow-hidden border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all">
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg bg-zinc-950 border-white/10">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white uppercase font-black tracking-widest">Delete Receipt</AlertDialogTitle>
                <AlertDialogDescription className="text-white/60">
                  Are you sure you want to delete this receipt? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-white/10 hover:bg-white/5">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <DialogTrigger asChild>
          <CardContent className="p-6 cursor-pointer">
            <div className="space-y-4">
              <div className="flex justify-between items-start gap-4">
                <h3 className="text-xl font-bold tracking-tighter leading-none line-clamp-2 flex-1">
                  {receipt.vendor || 'Unknown Vendor'}
                </h3>
                <Badge variant="outline" className="text-[10px] py-0 font-bold shrink-0 uppercase tracking-widest border-primary/20 bg-primary/5">
                  {receipt.category || primaryCategory}
                </Badge>
              </div>

              <div className="flex gap-6 items-start">
                <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-lg overflow-hidden bg-muted/20 relative border border-white/5">
                  <img
                    src={receipt.image_url}
                    alt={receipt.vendor || 'Receipt'}
                    className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-300"
                  />
                  {isUnprocessed && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between h-24 sm:h-28 py-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="text-xs font-bold tracking-tight uppercase">
                      {receipt.date ? new Date(receipt.date).toLocaleDateString() : 'No date'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    {isUnprocessed ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-[10px] py-0 uppercase font-black">OCR failed</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] px-2 gap-1.5 hover:bg-primary/10 hover:text-primary transition-colors font-bold"
                          onClick={handleReprocess}
                          disabled={isReprocessing}
                        >
                          {isReprocessing
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <RefreshCw className="h-3 w-3" />
                          }
                          PROCESSING
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {receipt.original_currency !== 'USD' && receipt.original_amount && (
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter mb-0.5">
                            {receipt.original_currency} {receipt.original_amount.toFixed(2)}
                          </p>
                        )}
                        <p className="text-2xl font-black tracking-tighter leading-none">
                          ${(receipt.usd_amount || receipt.total_amount || 0).toFixed(2)} <span className="text-[10px] font-bold text-muted-foreground uppercase ml-1">USD</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </DialogTrigger>
      </Card>

      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden bg-zinc-950 border-white/10 shadow-3xl">
        <DialogHeader className="p-6 pb-4 border-b border-white/5 bg-zinc-900/30">
          <div className="flex items-center justify-between w-full">
            <DialogTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-[0.2em] text-white/90">
              <Edit2 className="h-4 w-4" />
              Receipt Details
            </DialogTitle>
            <div className="flex gap-2 pr-8">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="h-9 px-4 font-black uppercase text-[10px] tracking-[0.15em] border-white/10 hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="h-9 px-6 font-black uppercase text-[10px] tracking-[0.15em] bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                {isSaving ? 'SAVING...' : 'ACCEPT CHANGES'}
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Receipt Preview */}
            <div className="space-y-4">
              <div className="flex flex-col gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-white/20 tracking-widest ml-1 block">Vendor Name</label>
                  <Input
                    value={editingVendor}
                    onChange={(e) => setEditingVendor(e.target.value)}
                    className="text-2xl font-black tracking-tighter bg-white/5 border-white/5 h-11 focus:bg-white/10 text-white"
                    placeholder="Vendor Name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-white/20 tracking-widest ml-1 block">Issued Date</label>
                  <Input
                    type="date"
                    value={editingDate}
                    onChange={(e) => setEditingDate(e.target.value)}
                    className="font-black bg-white/5 border-white/5 h-11 text-white text-lg tracking-tighter"
                  />
                </div>
              </div>

              <div className="w-full rounded-xl bg-black/20 overflow-hidden border border-white/5 shadow-2xl">
                <img
                  src={receipt.image_url}
                  alt={receipt.vendor || 'Receipt'}
                  className="w-full h-auto grayscale-[0.4] hover:grayscale-0 transition-all duration-700"
                />
              </div>
            </div>

            {/* Items Editor */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Positions</p>
                <div className="flex gap-2">
                  {receipt.raw_text && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-[9px] uppercase font-black tracking-widest text-white/80 hover:text-white hover:bg-white/10 transition-all">
                          View Raw OCR
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl bg-zinc-950 border-white/10">
                        <DialogHeader>
                          <DialogTitle className="text-white uppercase tracking-widest font-black text-sm">Raw OCR Output</DialogTitle>
                        </DialogHeader>
                        <div className="bg-black/40 p-6 rounded-xl border border-white/5 overflow-auto max-h-[60vh]">
                          <pre className="text-[10px] whitespace-pre-wrap font-mono text-white/60 leading-relaxed">
                            {receipt.raw_text}
                          </pre>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Button variant="outline" size="sm" onClick={handleAddExpense} className="h-7 gap-1.5 border-white/10 font-black uppercase text-[9px] tracking-widest hover:bg-white/5 text-white/80">
                    <Plus className="h-3 w-3" /> Add Item
                  </Button>
                </div>
              </div>

              {loadingExpenses ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full bg-white/5 rounded-lg" />
                  <Skeleton className="h-10 w-full bg-white/5 rounded-lg" />
                  <Skeleton className="h-10 w-full bg-white/5 rounded-lg" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 px-3 text-[9px] font-black uppercase text-white/20 tracking-widest mb-1">
                    <div className="col-span-12 sm:col-span-5">Position</div>
                    <div className={receipt.original_currency && receipt.original_currency !== 'USD' ? "col-span-12 sm:col-span-4" : "col-span-6 sm:col-span-3"}>Price</div>
                    <div className={receipt.original_currency && receipt.original_currency !== 'USD' ? "col-span-12 sm:col-span-3" : "col-span-6 sm:col-span-4"}>Category</div>
                  </div>

                  <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
                    {editingExpenses.map((exp) => (
                      <div key={exp.id} className="p-1.5 pl-3 border border-white/5 rounded-lg bg-white/[0.01] flex items-center gap-2 relative group/item hover:bg-white/[0.04] transition-all">
                        <div className="flex-1 min-w-0 grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-12 sm:col-span-5">
                            <Input
                              placeholder="Item name"
                              value={exp.item_name}
                              onChange={(e) => handleUpdateExpense(exp.id, 'item_name', e.target.value)}
                              className="h-8 text-xs font-bold bg-black/40 border-white/5 focus:border-primary/50 text-white placeholder:text-white/10"
                            />
                          </div>
                          
                          {receipt.original_currency && receipt.original_currency !== 'USD' ? (
                            <div className="col-span-12 sm:col-span-4 flex gap-1">
                              <div className="relative flex-1">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] font-black text-primary">{receipt.original_currency === 'EUR' ? '€' : receipt.original_currency}</span>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  value={exp.original_amount || 0}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const rate = (receipt.usd_amount! / receipt.original_amount!) || 1.08;
                                    handleUpdateExpense(exp.id, 'original_amount', val);
                                    handleUpdateExpense(exp.id, 'amount', val * rate);
                                  }}
                                  className="h-8 pl-5 pr-1 text-xs font-black bg-black/40 border-primary/20 focus:border-primary text-white"
                                />
                              </div>
                              <div className="relative flex-1 opacity-30">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] font-black text-white/40">$</span>
                                <Input
                                  type="number"
                                  value={exp.amount.toFixed(2)}
                                  disabled
                                  className="h-8 pl-4 pr-1 text-[10px] font-black bg-black/20 border-white/5 text-white"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="col-span-6 sm:col-span-3">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-white/40">$</span>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  value={exp.amount}
                                  onChange={(e) => handleUpdateExpense(exp.id, 'amount', parseFloat(e.target.value) || 0)}
                                  className="h-8 pl-4 pr-1 text-xs font-black bg-black/40 border-white/5 focus:border-primary/50 text-white"
                                />
                              </div>
                            </div>
                          )}

                          <div className={receipt.original_currency && receipt.original_currency !== 'USD' ? "col-span-12 sm:col-span-3" : "col-span-6 sm:col-span-4"}>
                            <Select
                              value={exp.category}
                              onValueChange={(val) => handleUpdateExpense(exp.id, 'category', val as Category)}
                            >
                              <SelectTrigger className="h-8 text-[9px] font-black bg-black/40 border-white/5 focus:border-primary/50 text-white/90 uppercase tracking-widest">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-950 border-white/10">
                                {categories.map((cat) => (
                                  <SelectItem key={cat} value={cat} className="text-[10px] font-black uppercase tracking-widest text-white/80 focus:text-white">
                                    {cat}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-white/30 hover:text-destructive hover:bg-destructive/10 transition-all"
                          onClick={() => handleRemoveExpense(exp.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Calculated Totals Footer */}
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                    <div className="flex justify-between items-baseline px-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Calculated Total</p>
                      <div className="flex flex-col items-end">
                        {receipt.original_currency !== 'USD' && (
                          <p className="text-sm font-black text-primary uppercase">
                            {receipt.original_currency === 'EUR' ? '€' : receipt.original_currency} {calculatedTotalOriginal.toFixed(2)}
                          </p>
                        )}
                        <p className="text-xl font-black text-white tracking-tighter">
                          ${calculatedTotalUSD.toFixed(2)} <span className="text-[10px] font-bold text-white/40 uppercase ml-1 tracking-widest">USD</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
