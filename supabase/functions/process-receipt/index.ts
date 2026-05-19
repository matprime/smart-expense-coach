import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRResponse {
  ParsedResults?: Array<{
    ParsedText: string;
    FileParseExitCode: number;
    ErrorMessage: string | null;
  }>;
  OCRExitCode: number;
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string[];
}

interface ExpenseItem {
  item_name: string;
  amount: number;
  category: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, receiptId } = await req.json();

    if (!imageUrl || !receiptId) {
      return new Response(
        JSON.stringify({ error: 'Missing imageUrl or receiptId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get OCR API key — stored as a Supabase secret
    const ocrApiKey = Deno.env.get('OCR_SPACE_API_KEY');
    if (!ocrApiKey) {
      console.error('OCR_SPACE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'OCR API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call OCR.space API directly — pass imageUrl + apikey as form fields
    // Language: 'eng' works for Latin-script languages including Slovenian
    // OCREngine 2 has auto language detection and better accuracy
    console.log('Calling OCR.space for imageUrl:', imageUrl);
    const formData = new FormData();
    formData.append('url', imageUrl);
    formData.append('apikey', ocrApiKey);
    formData.append('language', 'eng');
    formData.append('OCREngine', '2');
    formData.append('isTable', 'true');
    formData.append('isOverlayRequired', 'false');
    formData.append('scale', 'true');

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });

    const ocrResponseText = await ocrResponse.text();
    console.log('OCR response status:', ocrResponse.status);
    console.log('OCR response (first 400):', ocrResponseText.substring(0, 400));

    if (!ocrResponse.ok) {
      console.error('OCR API HTTP error:', ocrResponseText);
      return new Response(
        JSON.stringify({ error: 'OCR API error', details: ocrResponseText }),
        { status: ocrResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let ocrData: OCRResponse;
    try {
      ocrData = JSON.parse(ocrResponseText);
    } catch {
      console.error('Failed to parse OCR JSON:', ocrResponseText);
      return new Response(
        JSON.stringify({ error: 'Invalid OCR response', details: ocrResponseText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (ocrData.IsErroredOnProcessing || !ocrData.ParsedResults || ocrData.ParsedResults.length === 0) {
      const errMsg = ocrData.ErrorMessage?.join(', ') || 'No text extracted';
      console.error('OCR failed. ExitCode:', ocrData.OCRExitCode, 'Error:', errMsg);
      return new Response(
        JSON.stringify({ error: 'Failed to extract text from receipt', details: errMsg }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawText = ocrData.ParsedResults[0].ParsedText;
    console.log('OCR success. Text (first 300):', rawText.substring(0, 300));

    // Parse receipt data
    const parsedData = parseReceiptText(rawText);

    // Convert to USD
    const usdAmount = parsedData.totalAmount 
      ? await convertToUSD(parsedData.totalAmount, parsedData.currency)
      : null;

    // Update receipt with parsed data (supabase client already initialized above)
    const primaryCategory = parsedData.items.length > 0 ? parsedData.items[0].category : 'Other';
    
    const { error: updateError } = await supabase
      .from('receipts')
      .update({
        vendor: parsedData.vendor,
        date: parsedData.date,
        total_amount: parsedData.totalAmount,
        raw_text: rawText,
        original_currency: parsedData.currency,
        original_amount: parsedData.originalAmount,
        usd_amount: usdAmount,
        category: primaryCategory,
      })
      .eq('id', receiptId);

    if (updateError) {
      console.error('Error updating receipt:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update receipt', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert expenses
    if (parsedData.items.length > 0) {
      const expensesToInsert = await Promise.all(
        parsedData.items.map(async (item) => {
          const itemUsdAmount = await convertToUSD(item.amount, parsedData.currency);
          return {
            receipt_id: receiptId,
            item_name: item.item_name,
            amount: itemUsdAmount,
            category: item.category,
            original_currency: parsedData.currency,
            original_amount: item.amount,
            usd_amount: itemUsdAmount,
          };
        })
      );

      const { error: expensesError } = await supabase
        .from('expenses')
        .insert(expensesToInsert);

      if (expensesError) {
        console.error('Error inserting expenses:', expensesError);
        return new Response(
          JSON.stringify({ error: 'Failed to insert expenses', details: expensesError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        vendor: parsedData.vendor,
        date: parsedData.date,
        totalAmount: parsedData.totalAmount,
        currency: parsedData.currency,
        usdAmount: usdAmount,
        itemsCount: parsedData.items.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing receipt:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseReceiptText(text: string): {
  vendor: string | null;
  date: string | null;
  totalAmount: number | null;
  items: ExpenseItem[];
  currency: string;
  originalAmount: number | null;
} {
  // Use both \n and \r\n for line splitting
  const rawLines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  
  // Clean lines: handle tab separations from isTable=true
  const lines = rawLines.map(line => line.replace(/\t+/g, '   '));

  let vendor: string | null = null;
  let date: string | null = null;
  let totalAmount: number | null = null;
  let currency = 'USD';
  const items: ExpenseItem[] = [];

  // 1. Detect currency
  const currencyMap: Record<string, string> = {
    '€': 'EUR', 'eur': 'EUR',
    '£': 'GBP', 'gbp': 'GBP',
    '¥': 'JPY', 'jpy': 'JPY', 'cny': 'JPY',
    '₹': 'INR', 'inr': 'INR',
    '$': 'USD', 'usd': 'USD'
  };

  for (const [sym, code] of Object.entries(currencyMap)) {
    if (text.includes(sym) || text.toLowerCase().includes(code.toLowerCase())) {
      currency = code;
      break;
    }
  }

  // 2. Extract vendor (look in first 5 lines or common patterns)
  const commonVendors = [
    // International chains
    'UBER', 'LYFT', 'DOORDASH', 'GRUBHUB', 'STARBUCKS', 'WALMART', 'TARGET', 
    'WHOLE FOODS', 'AMC', 'COSTCO', 'MCDONALD', 'SUBWAY', 'KFC', 'BURGER KING', 
    'PIZZA HUT', 'DOMINO', '7-ELEVEN', 'WRECKING BAR', 'TACO BELL', 'CHIPOTLE',
    'APPLE', 'AMAZON', 'SHELL', 'EXXON', 'BP', 'CHEVRON', 'TESLA',
    // Slovenian stores and chains
    'MERCATOR', 'HOFER', 'LIDL', 'SPAR', 'TUŠ', 'TUS', 'EUROSPIN', 'INTERSPAR',
    'PETROL', 'OMV', 'MOL', 'LECLERC', 'MÜLLER', 'MULLER', 'DM', 'JYSK',
    'BAUHAUS', 'OBI', 'MERKUR', 'KONZUM', 'BILLA', 'PENNY'
  ];

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const upperLine = lines[i].toUpperCase();
    for (const v of commonVendors) {
      if (upperLine.includes(v)) {
        vendor = lines[i];
        break;
      }
    }
    if (vendor) break;
  }
  if (!vendor && lines.length > 0) vendor = lines[0];

  // 3. Extract date
  const datePatterns = [
    /(\d{1,2}\.\d{1,2}\.\d{4})\s+\d{1,2}:\d{2}/i,  // 12.05.2026 12:05 (DD.MM.YYYY with time)
    /(\d{1,2}\.\d{1,2}\.\d{4})/i,                    // 12.05.2026 (DD.MM.YYYY)
    /(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/i,            // 2024-05-07
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,            // 07/05/2024 or 05/07/24
    /(\w{3}\s+\d{1,2},?\s+\d{4})/i,                  // May 07, 2024
    /(\d{1,2}\s+\w{3,9}\s+\d{4})/i,                  // 07 May 2024
  ];

  const dateKeywords = ['DATUM', 'DATE', 'DNE', 'IZDANO'];

  for (const line of lines) {
    const upperLine = line.toUpperCase();
    // Skip address-like lines (common in Slovenia: Ulica, Cesta, Trg)
    if (upperLine.includes('ULICA') || upperLine.includes('CESTA') || upperLine.includes('TRG')) continue;

    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        // If we found a line with a date keyword, that's almost certainly the date
        if (dateKeywords.some(kw => upperLine.includes(kw))) {
          date = parseDate(match[1] || match[0]);
          break;
        }
        // Otherwise, save it as a candidate if we don't have one yet
        if (!date) date = parseDate(match[1] || match[0]);
      }
    }
  }

  // 4. Extract Total Amount and Items
  const totalKeywords = [
    // English
    'TOTAL', 'AMOUNT DUE', 'BALANCE', 'SUM', 'TOTAL:', 'GRAND TOTAL', 'NET AMOUNT',
    // Slovenian
    'SKUPAJ', 'ZNESEK', 'ZA PLAČILO', 'ZA PLACILO', 'VSOTA', 'KONČNI ZNESEK', 'KONCNI ZNESEK'
  ];
  const ignoreKeywords = [
    'SUBTOTAL', 'TAX', 'VAT', 'GST', 'CASH', 'CHANGE', 'BALANCE', 'DATE', 'TIME', 
    'PHONE', 'ADDRESS', 'WWW.', '.COM', 'HTTP', 'TEL:', 'FAX:', 'TRANS:', 'ID:', 
    'ORDER', 'CHECK', 'TABLE', 'GUEST', 'SERVER', 'ST#', 'STORE',
    // Slovenian
    'DAVEK', 'DDV', 'GOTOVINA', 'VRAČILO', 'DATUM', 'ČAS', 'CAS', 'TELEFON', 
    'NASLOV', 'NAROČILO', 'NAROCILO', 'MIZA', 'STREŽNIK', 'STREZNIK'
  ];

  // Regex for prices (supports . and , as decimals, optional currency suffix)
  // Require at least 2 digits before decimal to avoid date fragments like "12.05"
  const priceRegex = /(?:[€£¥₹$]\s*)?(\d{1,6}[,.]\d{2})\s*(?:EUR|USD|GBP|JPY|INR|CAD|AUD)?\b/;
  // Stricter: only match if it looks like a standalone price (not part of a date or measurement)
  const standalonePriceRegex = /(?:^|[\s:])(\d{1,6}[,.]\d{2})\s*(?:EUR|USD|GBP|JPY|INR|CAD|AUD)?(?:\s|$)/;

  const extractPrice = (line: string): number | null => {
    // Skip lines that look like dates (DD.MM.YYYY or time HH:MM:SS)
    if (/\d{1,2}\.\d{2}\.\d{4}/.test(line)) return null;
    // Try standalone price first
    let m = line.match(standalonePriceRegex);
    if (!m) m = line.match(priceRegex);
    if (m) return parseFloat(m[1].replace(',', '.'));
    return null;
  };

  // Find total line — check same line AND the next line for the amount
  let totalLineIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const upperLine = lines[i].toUpperCase();
    if (totalKeywords.some(kw => upperLine.includes(kw))) {
      // Try price on same line
      const sameLinePrice = extractPrice(lines[i]);
      if (sameLinePrice !== null) {
        totalAmount = sameLinePrice;
        totalLineIndex = i;
        break;
      }
      // Try price on next line (common in Slovenian receipts)
      if (i + 1 < lines.length) {
        const nextLinePrice = extractPrice(lines[i + 1]);
        if (nextLinePrice !== null) {
          totalAmount = nextLinePrice;
          totalLineIndex = i + 1;
          break;
        }
      }
    }
  }

  // If total not found by keywords, look for largest amount in last few lines
  if (!totalAmount) {
    let maxFound = 0;
    for (let i = Math.max(0, lines.length - 10); i < lines.length; i++) {
      const val = extractPrice(lines[i]);
      if (val !== null && val > maxFound) {
        maxFound = val;
        totalLineIndex = i;
      }
    }
    if (maxFound > 0) totalAmount = maxFound;
  }

  // Extract items from lines BEFORE the total line
  const endSearchIndex = totalLineIndex !== -1 ? totalLineIndex : lines.length;
  // Start search after the vendor line
  const vendorIndex = vendor ? lines.indexOf(vendor) : -1;
  const startSearchIndex = vendorIndex !== -1 ? vendorIndex + 1 : 0;

  for (let i = startSearchIndex; i < endSearchIndex; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();

    // Skip noise and tax lines
    if (ignoreKeywords.some(kw => upperLine.includes(kw))) continue;
    if (upperLine.length < 2) continue;
    if (/^\d+$/.test(upperLine)) continue;

    const amount = extractPrice(line);
    if (amount !== null) {
      // Find item name
      let itemName = line.replace(/(?:[€£¥₹$]\s*)?\d{1,6}[,.]\d{2}\s*(?:EUR|USD|GBP|JPY|INR|CAD|AUD)?/i, '')
                         .replace(/[^\w\s\.-]/g, ' ').trim();
      
      // If the current line is mostly just the price, look at previous lines
      if (itemName.length < 3 && i > startSearchIndex) {
        // Look back up to 2 lines to find the name (skip quantity/unit price lines)
        for (let j = 1; j <= 2; j++) {
          if (i - j < startSearchIndex) break;
          const prevLine = lines[i - j];
          const prevUpper = prevLine.toUpperCase();
          
          // Skip lines with quantity patterns like "17.390 L", "x 2", "1.734 EUR/L"
          if (/\d+[,.]\d{3}\s*[L]/i.test(prevLine) || 
              /EUR\/L/i.test(prevLine) || 
              /\d+\s*x\s*\d+/i.test(prevLine) ||
              totalKeywords.some(kw => prevUpper.includes(kw))) {
            continue;
          }

          // Check if prev line is not a date, vendor or noise
          if (!datePatterns.some(p => p.test(prevLine)) && 
              !ignoreKeywords.some(kw => prevUpper.includes(kw)) &&
              extractPrice(prevLine) === null &&
              prevLine.length > 2) {
            itemName = prevLine;
            break;
          }
        }
      }

      const cleanItemName = itemName.replace(/\.{2,}/g, ' ').replace(/\s+/g, ' ').trim();

      if (amount > 0 && amount < (totalAmount || 1000000) && cleanItemName.length > 2) {
        // Prevent duplicate items (sometimes OCR repeats lines)
        if (!items.some(item => item.item_name === cleanItemName && item.amount === amount)) {
          items.push({
            item_name: cleanItemName,
            amount,
            category: categorizeItem(cleanItemName, vendor || '')
          });
        }
      }
    }
  }

  // Fallback: If no items found, or if we have a total but no items, use vendor as item name
  // BUT only if we didn't already find the actual items. 
  // User says "correctly recognizes vendor but it takes vendor as position on bill"
  // This likely happens because items.length was 0.
  if (items.length === 0 && totalAmount) {
    // Try to find any line that looks like an item but didn't have a price on it
    let foundFallback = false;
    for (let i = startSearchIndex; i < endSearchIndex; i++) {
      const line = lines[i];
      if (line.length > 3 && !extractPrice(line) && !ignoreKeywords.some(kw => line.toUpperCase().includes(kw))) {
        items.push({
          item_name: line,
          amount: totalAmount,
          category: categorizeItem(line, vendor || '')
        });
        foundFallback = true;
        break;
      }
    }
    
    if (!foundFallback) {
      items.push({
        item_name: vendor || 'Receipt Total',
        amount: totalAmount,
        category: categorizeItem(vendor || '', vendor || '')
      });
    }
  }

  // Ensure totalAmount matches sum of items if total was missing
  if (!totalAmount && items.length > 0) {
    totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  }

  return { 
    vendor, 
    date, 
    totalAmount, 
    items, 
    currency, 
    originalAmount: totalAmount 
  };
}

function parseDate(dateStr: string): string {
  try {
    // Handle DD.MM.YYYY format (common in Europe/Slovenia)
    const dotFormat = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dotFormat) {
      const [, day, month, year] = dotFormat;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    // Try standard parsing
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Ignore parsing errors
  }
  return new Date().toISOString().split('T')[0];
}

async function convertToUSD(amount: number, fromCurrency: string): Promise<number> {
  // Simple conversion rates (in production, use a real API)
  const rates: Record<string, number> = {
    'USD': 1.0,
    'EUR': 1.08,
    'GBP': 1.27,
    'JPY': 0.0067,
    'CNY': 0.14,
    'INR': 0.012,
    'CAD': 0.72,
    'AUD': 0.65,
  };

  const rate = rates[fromCurrency] || 1.0;
  return amount * rate;
}

function categorizeItem(itemName: string, vendor: string): string {
  const lowerItem = itemName.toLowerCase();
  const lowerVendor = vendor.toLowerCase();

  // Transport keywords (English + Slovenian)
  if (
    lowerItem.includes('uber') ||
    lowerItem.includes('lyft') ||
    lowerItem.includes('taxi') ||
    lowerItem.includes('ride') ||
    lowerItem.includes('trip') ||
    lowerItem.includes('gas') ||
    lowerItem.includes('fuel') ||
    lowerItem.includes('diesel') ||
    lowerItem.includes('petrol') ||
    lowerItem.includes('evo diesel') ||
    lowerItem.includes('parking') ||
    lowerItem.includes('shell') ||
    lowerItem.includes('exxon') ||
    lowerItem.includes('train') ||
    lowerItem.includes('bus') ||
    lowerItem.includes('gorivo') ||
    lowerItem.includes('bencin') ||
    lowerItem.includes('dizel') ||
    lowerItem.includes('parkiranje') ||
    lowerItem.includes('vlak') ||
    lowerItem.includes('avtobus') ||
    lowerItem.includes('prevoz') ||
    lowerVendor.includes('uber') ||
    lowerVendor.includes('lyft') ||
    lowerVendor.includes('shell') ||
    lowerVendor.includes('exxon') ||
    lowerVendor.includes('petrol') ||
    lowerVendor.includes('omv') ||
    lowerVendor.includes('mol')
  ) {
    return 'Transport';
  }

  // Food keywords (English + Slovenian)
  if (
    lowerItem.includes('pizza') ||
    lowerItem.includes('burger') ||
    lowerItem.includes('sandwich') ||
    lowerItem.includes('coffee') ||
    lowerItem.includes('latte') ||
    lowerItem.includes('espresso') ||
    lowerItem.includes('delivery') ||
    lowerItem.includes('restaurant') ||
    lowerItem.includes('cafe') ||
    lowerItem.includes('diner') ||
    lowerItem.includes('sushi') ||
    lowerItem.includes('steak') ||
    lowerItem.includes('kava') ||
    lowerItem.includes('pijača') ||
    lowerItem.includes('pijaca') ||
    lowerItem.includes('hrana') ||
    lowerItem.includes('restavracija') ||
    lowerItem.includes('gostilna') ||
    lowerItem.includes('dostava') ||
    lowerVendor.includes('doordash') ||
    lowerVendor.includes('grubhub') ||
    lowerVendor.includes('ubereats') ||
    lowerVendor.includes('starbucks') ||
    lowerVendor.includes('mcdonald') ||
    lowerVendor.includes('subway') ||
    lowerVendor.includes('kfc') ||
    lowerVendor.includes('burger king') ||
    lowerVendor.includes('taco bell') ||
    lowerVendor.includes('chipotle') ||
    lowerVendor.includes('panera')
  ) {
    return 'Food';
  }

  // Groceries keywords (English + Slovenian)
  if (
    lowerItem.includes('vegetable') ||
    lowerItem.includes('fruit') ||
    lowerItem.includes('dairy') ||
    lowerItem.includes('bread') ||
    lowerItem.includes('meat') ||
    lowerItem.includes('grocery') ||
    lowerItem.includes('supermarket') ||
    lowerItem.includes('produce') ||
    lowerItem.includes('bakery') ||
    lowerItem.includes('zelenjava') ||
    lowerItem.includes('sadje') ||
    lowerItem.includes('mleko') ||
    lowerItem.includes('kruh') ||
    lowerItem.includes('meso') ||
    lowerItem.includes('živila') ||
    lowerItem.includes('zivila') ||
    lowerItem.includes('trgovina') ||
    lowerVendor.includes('walmart') ||
    lowerVendor.includes('target') ||
    lowerVendor.includes('whole foods') ||
    lowerVendor.includes('costco') ||
    lowerVendor.includes('safeway') ||
    lowerVendor.includes('kroger') ||
    lowerVendor.includes('publix') ||
    lowerVendor.includes('aldi') ||
    lowerVendor.includes('trader joe') ||
    lowerVendor.includes('mercator') ||
    lowerVendor.includes('hofer') ||
    lowerVendor.includes('lidl') ||
    lowerVendor.includes('spar') ||
    lowerVendor.includes('tuš') ||
    lowerVendor.includes('tus') ||
    lowerVendor.includes('eurospin') ||
    lowerVendor.includes('interspar')
  ) {
    return 'Groceries';
  }

  // Entertainment keywords (English + Slovenian)
  if (
    lowerItem.includes('movie') ||
    lowerItem.includes('ticket') ||
    lowerItem.includes('popcorn') ||
    lowerItem.includes('game') ||
    lowerItem.includes('concert') ||
    lowerItem.includes('theatre') ||
    lowerItem.includes('theater') ||
    lowerItem.includes('museum') ||
    lowerItem.includes('zoo') ||
    lowerItem.includes('aquarium') ||
    lowerItem.includes('film') ||
    lowerItem.includes('vstopnica') ||
    lowerItem.includes('kino') ||
    lowerItem.includes('koncert') ||
    lowerItem.includes('gledališče') ||
    lowerItem.includes('gledalisce') ||
    lowerItem.includes('muzej') ||
    lowerItem.includes('živalski vrt') ||
    lowerItem.includes('zivalski vrt') ||
    lowerVendor.includes('amc') ||
    lowerVendor.includes('cinema') ||
    lowerVendor.includes('netflix') ||
    lowerVendor.includes('spotify') ||
    lowerVendor.includes('disney+') ||
    lowerVendor.includes('hulu') ||
    lowerVendor.includes('kolosej') ||
    lowerVendor.includes('cineplexx')
  ) {
    return 'Entertainment';
  }

  return 'Other';
}
