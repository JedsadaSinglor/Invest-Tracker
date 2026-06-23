
import { Transaction, TransactionType } from '../types';
import { generateId } from './formatting';

const escapeCSV = (str: string | number | undefined) => {
  if (str === undefined || str === null) return '';
  const stringValue = String(str);
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const transactionsToCSV = (transactions: Transaction[]): string => {
  const headers = ['ID', 'Date', 'Type', 'Symbol', 'Shares', 'Price', 'Fee', 'Asset Class', 'Exchange Rate', 'Notes', 'Total Value'];
  const csvRows = [headers.join(',')];

  for (const t of transactions) {
    const totalValue = (t.shares && (t.type === TransactionType.BUY || t.type === TransactionType.SELL))
        ? (t.shares * (t.price || 0))
        : (t.price || 0);

    const row = [
      escapeCSV(t.id), escapeCSV(t.date), escapeCSV(t.type), escapeCSV(t.symbol),
      escapeCSV(t.shares), escapeCSV(t.price), escapeCSV(t.fee), escapeCSV(t.assetClass),
      escapeCSV(t.exchangeRate), escapeCSV(t.notes), escapeCSV(totalValue)
    ];
    csvRows.push(row.join(','));
  }
  return csvRows.join('\n');
};

const parseCSVLine = (text: string) => {
  const result = [];
  let curVal = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuote) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') { curVal += '"'; i++; } 
        else { inQuote = false; }
      } else { curVal += char; }
    } else {
      if (char === '"') { inQuote = true; } 
      else if (char === ',') { result.push(curVal); curVal = ''; } 
      else { curVal += char; }
    }
  }
  result.push(curVal);
  return result;
};

export const csvToTransactions = (csvContent: string): Transaction[] => {
  const cleanContent = csvContent.replace(/^\uFEFF/, '');
  const lines = cleanContent.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const normalizeHeader = (h: string) => {
    const lower = h.trim().toLowerCase().replace(/['"]/g, '');
    if (['qty', 'quantity', 'units', 'count'].includes(lower)) return 'shares';
    if (['cost', 'rate', 'price per share', 'unit price', 'price'].includes(lower)) return 'price';
    if (['amount', 'total', 'total value', 'value', 'total amount', 'market value'].includes(lower)) return 'total_value_temp';
    if (['ticker', 'stock', 'asset', 'symbol'].includes(lower)) return 'symbol';
    if (['transaction type', 'action', 'operation', 'type'].includes(lower)) return 'type';
    if (['date', 'time', 'timestamp'].includes(lower)) return 'date';
    if (['fee', 'commission', 'cost'].includes(lower)) return 'fee';
    return lower;
  };

  const headers = lines[0].split(',').map(normalizeHeader);
  const transactions: Transaction[] = [];

  const parseNumber = (val: string | undefined): number => {
    if (!val) return 0;
    const clean = val.replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const parseDate = (val: string): string => {
     if (!val) return new Date().toISOString().split('T')[0];
     const date = new Date(val);
     if (!isNaN(date.getTime())) { return date.toISOString().split('T')[0]; }
     return new Date().toISOString().split('T')[0];
  };

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const t: any = {};
    let totalValueTemp = 0;

    headers.forEach((header, index) => {
      let val = values[index];
      if (val === undefined || val === '') return;
      val = val.trim();
      
      switch (header) {
        case 'id': t.id = val; break;
        case 'date': t.date = parseDate(val); break;
        case 'type': t.type = val.toUpperCase(); break;
        case 'symbol': t.symbol = val.toUpperCase(); break;
        case 'shares': t.shares = parseNumber(val); break;
        case 'price': t.price = parseNumber(val); break;
        case 'fee': t.fee = parseNumber(val); break;
        case 'asset class': t.assetClass = val; break; 
        case 'exchange rate': t.exchangeRate = parseNumber(val); break;
        case 'notes': t.notes = val; break;
        case 'total_value_temp': totalValueTemp = parseNumber(val); break;
      }
    });
    
    if ((t.type === 'BUY' || t.type === 'SELL') && (!t.price || t.price === 0)) {
        if (totalValueTemp > 0 && t.shares > 0) { t.price = totalValueTemp / t.shares; }
    }
    if ((['DEPOSIT', 'WITHDRAW', 'DIVIDEND'].includes(t.type)) && (!t.price || t.price === 0)) {
        if (totalValueTemp > 0) t.price = totalValueTemp;
    }

    if (t.date && t.type) {
        if (!t.id) t.id = generateId();
        if (isNaN(t.shares)) t.shares = 0;
        if (isNaN(t.price)) t.price = 0;
        if (isNaN(t.fee)) t.fee = 0;
        transactions.push(t as Transaction);
    }
  }
  return transactions;
};
