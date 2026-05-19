import React from 'react';
import { AppLayout } from '@/components/layouts/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { ReceiptCard } from '@/components/ReceiptCard';
import type { Receipt } from '@/types';
import { trackEvent } from '@/lib/analytics';
import { compressImageIfNeeded } from '@/lib/image';

export default function UploadReceipt() {
  const [uploading, setUploading] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);
  const [receipts, setReceipts] = React.useState<Receipt[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    trackEvent('Upload Receipt Page', 'page_view');
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error loading receipts:', error);
    }
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    try {
      await supabase.from('expenses').delete().eq('receipt_id', receiptId);
      await supabase.from('receipts').delete().eq('id', receiptId);
      setReceipts(receipts.filter(r => r.id !== receiptId));
      toast.success('Receipt deleted successfully');
    } catch (error) {
      console.error('Error deleting receipt:', error);
      toast.error('Failed to delete receipt');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    try {
      // Show compression message for large files
      if (file.size > 1024 * 1024) {
        toast.info('Compressing image, please wait...');
      }

      const processedFile = await compressImageIfNeeded(file);
      
      console.log('Original size:', file.size, 'Compressed size:', processedFile.size);
      
      if (processedFile.size > 1024 * 1024) {
        toast.error(`Image is still ${(processedFile.size / (1024 * 1024)).toFixed(2)}MB after compression. Please try a smaller image.`);
        return;
      }

      await uploadReceipt(processedFile, file.name);
    } catch (error) {
      console.error('Compression error:', error);
      toast.error('Failed to process image. Please try again.');
    }
  };

  const uploadReceipt = async (fileOrBlob: File | Blob, originalName: string) => {
    try {
      setUploading(true);

      // Determine correct extension and content type
      // A compressed Blob is always image/jpeg regardless of original extension
      const isJpegBlob = !(fileOrBlob instanceof File) && fileOrBlob.type === 'image/jpeg';
      const contentType = fileOrBlob.type || 'image/jpeg';
      const fileExt = isJpegBlob ? 'jpg' : (originalName.split('.').pop() || 'jpg');
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = fileName;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, fileOrBlob, {
          contentType,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(filePath);

      // Create receipt record
      const { data: receiptData, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          image_url: urlData.publicUrl,
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      trackEvent('Receipt Uploaded', 'upload', { receiptId: receiptData.id });
      toast.success('Receipt uploaded successfully');
      setUploading(false);
      setProcessing(true);

      // Small delay to ensure storage URL is fully propagated before OCR fetches it
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Process with OCR
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke('process-receipt', {
        body: {
          imageUrl: urlData.publicUrl,
          receiptId: receiptData.id,
        },
      });

      if (ocrError) {
        const errorMsg = await ocrError?.context?.text().catch(() => ocrError?.message);
        console.error('OCR processing error:', errorMsg || ocrError?.message);
        trackEvent('OCR Failed', 'ocr', { receiptId: receiptData.id, error: errorMsg || ocrError?.message });
        toast.error('Failed to process receipt. The image was saved — please try again.');
        setProcessing(false);
        await loadReceipts();
        return;
      }

      trackEvent('OCR Success', 'ocr', { 
        receiptId: receiptData.id,
        vendor: ocrData?.vendor,
        amount: ocrData?.totalAmount,
        currency: ocrData?.currency
      });
      toast.success('Receipt processed successfully');
      setProcessing(false);

      // Reload receipts
      await loadReceipts();

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast.error('Failed to upload receipt');
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      try {
        // Show compression message for large files
        if (file.size > 1024 * 1024) {
          toast.info('Compressing image, please wait...');
        }

        const processedFile = await compressImageIfNeeded(file);
        
        console.log('Original size:', file.size, 'Compressed size:', processedFile.size);
        
        if (processedFile.size > 1024 * 1024) {
          toast.error(`Image is still ${(processedFile.size / (1024 * 1024)).toFixed(2)}MB after compression. Please try a smaller image.`);
          return;
        }

        await uploadReceipt(processedFile, file.name);
      } catch (error) {
        console.error('Compression error:', error);
        toast.error('Failed to process image. Please try again.');
      }
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2 text-balance">Upload Receipt</h1>
          <p className="text-muted-foreground text-pretty">
            Upload a photo of your receipt to automatically extract and categorize expenses
          </p>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload New Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 md:p-12 text-center space-y-4"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {uploading || processing ? (
                <div className="space-y-4">
                  <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                  <div>
                    <p className="font-medium">
                      {uploading ? 'Uploading receipt...' : 'Processing with OCR...'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 text-pretty">
                      {uploading
                        ? 'Please wait while we upload your receipt'
                        : 'Extracting vendor, date, amount, and items from your receipt'}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium mb-1">Drop your receipt here or click to browse</p>
                    <p className="text-sm text-muted-foreground text-pretty">
                      Supports JPG, PNG. Images &gt; 1MB will be auto-compressed.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="receipt-upload"
                  />
                  <Button asChild>
                    <label htmlFor="receipt-upload" className="cursor-pointer">
                      Select File
                    </label>
                  </Button>
                </>
              )}
            </div>

            {/* Instructions */}
            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium">Tips for best results:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-success" />
                  <span>Ensure the receipt is well-lit and in focus</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-success" />
                  <span>Capture the entire receipt including vendor name and total</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-success" />
                  <span>Avoid shadows and glare on the receipt</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                  <span>Don't upload blurry or damaged receipts</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Recent Receipts */}
        {receipts.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2 text-balance">Your Receipts</h2>
              <p className="text-sm text-muted-foreground text-pretty">
                Recently uploaded and processed receipts
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              {receipts.map((receipt) => (
                <ReceiptCard 
                  key={receipt.id} 
                  receipt={receipt} 
                  onDelete={handleDeleteReceipt}
                  onUpdate={loadReceipts}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
