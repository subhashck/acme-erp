const fs = require('fs');

let content = fs.readFileSync('d:\\dev\\acme\\acme-erp\\src\\routes\\_authenticated\\reports\\$id.tsx', 'utf8');

// 1. Add ChevronDown, ChevronUp imports
content = content.replace(
  'import { ArrowLeft, Printer, Edit2, Lock, FileText, CheckCircle, AlertTriangle, HelpCircle } from "lucide-react";',
  'import { ArrowLeft, Printer, Edit2, Lock, FileText, CheckCircle, AlertTriangle, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";'
);

// 2. Add Panel component after imports
const panelComponent = `
const Panel = ({ title, amount, children, defaultExpanded = true, titleClass = "" }: any) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  return (
    <Card className="card border bg-card">
      <CardHeader 
        className="py-3 bg-muted/20 border-b cursor-pointer hover:bg-muted/30 transition-colors select-none" 
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <div className="no-print opacity-50">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
            <span>{title}</span>
          </div>
          <span className={cn("text-sm font-black", titleClass)}>{amount}</span>
        </CardTitle>
      </CardHeader>
      <div className={cn("print:block", !expanded && "hidden")}>
        <CardContent className="p-3">
          {children}
        </CardContent>
      </div>
    </Card>
  );
};
`;
content = content.replace('type ServiceCategory =', panelComponent + '\ntype ServiceCategory =');

// 3. Move Reconciled Summary Block to top
const summaryRegex = /\{\/\* Reconciled Summary Block \*\/\}[\s\S]*?Closing Statement Summary[\s\S]*?Calculated Closing[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;
const match = content.match(summaryRegex);

if (match) {
  let summaryBlock = match[0];
  content = content.replace(match[0], '');
  
  // Make the summary block take full width and add some margin at bottom
  summaryBlock = summaryBlock.replace('max-w-lg ml-auto', 'w-full max-w-none mb-8');

  // Insert before 3-Column Reconciliation Sheet
  const insertTarget = '      {/* 3-Column Reconciliation Sheet */}';
  content = content.replace(insertTarget, summaryBlock + '\n\n' + insertTarget);
} else {
  console.log("Summary block not found!");
}

// 4. Replace Cards with Panels
// To Balance B/f
content = content.replace(
  /<Card className="card border bg-card">\s*<CardHeader className="py-3 bg-muted\/20 border-b">\s*<CardTitle className="text-xs font-extrabold flex justify-between items-center text-muted-foreground uppercase tracking-wider">\s*<span>To Balance B\/f<\/span>\s*<span className="text-foreground text-sm font-black">\{fmt\(openingBalance\)\}<\/span>\s*<\/CardTitle>\s*<\/CardHeader>\s*<\/Card>/g,
  '<Panel title="To Balance B/f" amount={fmt(openingBalance)} />'
);

// Dynamic Categories
content = content.replace(
  /<Card key=\{cat\.code\} className="card border bg-card">\s*<CardHeader className="py-3 bg-muted\/20 border-b">\s*<CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">\s*<span>\{cat\.label\}<\/span>\s*<span className="text-teal-650 dark:text-teal-400 text-sm font-black">\{fmt\(cat\.total\)\}<\/span>\s*<\/CardTitle>\s*<\/CardHeader>\s*<CardContent className="p-3">([\s\S]*?)<\/CardContent>\s*<\/Card>/g,
  '<Panel key={cat.code} title={cat.label} amount={fmt(cat.total)} titleClass="text-teal-650 dark:text-teal-400">\n$1\n</Panel>'
);

// IPD Admissions
content = content.replace(
  /<Card className="card border bg-card">\s*<CardHeader className="py-3 bg-muted\/20 border-b">\s*<CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">\s*<span>IPD Admissions \/ Advances<\/span>\s*<span className="text-teal-650 dark:text-teal-400 text-sm font-black">\{fmt\(ipdAdmissionsTotal\)\}<\/span>\s*<\/CardTitle>\s*<\/CardHeader>\s*<CardContent className="p-3">([\s\S]*?)<\/CardContent>\s*<\/Card>/g,
  '<Panel title="IPD Admissions / Advances" amount={fmt(ipdAdmissionsTotal)} titleClass="text-teal-650 dark:text-teal-400">\n$1\n</Panel>'
);

// IPD Discharges
content = content.replace(
  /<Card className="card border bg-card">\s*<CardHeader className="py-3 bg-muted\/20 border-b">\s*<CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">\s*<span>IPD Discharges<\/span>\s*<span className="text-teal-650 dark:text-teal-400 text-sm font-black">\{fmt\(ipdDischargesTotal\)\}<\/span>\s*<\/CardTitle>\s*<\/CardHeader>\s*<CardContent className="p-3">([\s\S]*?)<\/CardContent>\s*<\/Card>/g,
  '<Panel title="IPD Discharges" amount={fmt(ipdDischargesTotal)} titleClass="text-teal-650 dark:text-teal-400">\n$1\n</Panel>'
);

// Additional Incomes
content = content.replace(
  /<Card className="card border bg-card">\s*<CardHeader className="py-3 bg-muted\/20 border-b">\s*<CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">\s*<span>Additional Incomes \(Add\)<\/span>\s*<span className="text-teal-650 dark:text-teal-400 text-sm font-black">\{fmt\(additionalIncomeTotal\)\}<\/span>\s*<\/CardTitle>\s*<\/CardHeader>\s*<CardContent className="p-3 space-y-2 text-xs">([\s\S]*?)<\/CardContent>\s*<\/Card>/g,
  '<Panel title="Additional Incomes (Add)" amount={fmt(additionalIncomeTotal)} titleClass="text-teal-650 dark:text-teal-400">\n<div className="space-y-2 text-xs">\n$1\n</div>\n</Panel>'
);

// Discounts
content = content.replace(
  /<Card className="card border bg-card">\s*<CardHeader className="py-3 bg-muted\/20 border-b">\s*<CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">\s*<span>Discounts & Returns<\/span>\s*<span className="text-rose-600 dark:text-rose-455 text-sm font-black">-\{fmt\(discountsTotal\)\}<\/span>\s*<\/CardTitle>\s*<\/CardHeader>\s*<CardContent className="p-3 space-y-2 text-xs">([\s\S]*?)<\/CardContent>\s*<\/Card>/g,
  '<Panel title="Discounts & Returns" amount={"-" + fmt(discountsTotal)} titleClass="text-rose-600 dark:text-rose-455">\n<div className="space-y-2 text-xs">\n$1\n</div>\n</Panel>'
);

// Expenditures
content = content.replace(
  /<Card className="card border bg-card">\s*<CardHeader className="py-3 bg-muted\/20 border-b">\s*<CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">\s*<span>Expenditures \(Out\)<\/span>\s*<span className="text-rose-600 dark:text-rose-400 text-sm font-black">\{fmt\(expendituresTotal\)\}<\/span>\s*<\/CardTitle>\s*<\/CardHeader>\s*<CardContent className="p-3">([\s\S]*?)<\/CardContent>\s*<\/Card>/g,
  '<Panel title="Expenditures (Out)" amount={fmt(expendituresTotal)} titleClass="text-rose-600 dark:text-rose-400">\n$1\n</Panel>'
);

// Staff Advances
content = content.replace(
  /<Card className="card border bg-card">\s*<CardHeader className="py-3 bg-muted\/20 border-b">\s*<CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">\s*<span>Staff Advances<\/span>\s*<span className="text-rose-600 dark:text-rose-400 text-sm font-black">\{fmt\(staffAdvancesTotal\)\}<\/span>\s*<\/CardTitle>\s*<\/CardHeader>\s*<CardContent className="p-3">([\s\S]*?)<\/CardContent>\s*<\/Card>/g,
  '<Panel title="Staff Advances" amount={fmt(staffAdvancesTotal)} titleClass="text-rose-600 dark:text-rose-400">\n$1\n</Panel>'
);

// Payment Channel
content = content.replace(
  /<Card className="card border bg-card">\s*<CardHeader className="py-3 bg-muted\/20 border-b">\s*<CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">\s*<span>Payment Channel Collections<\/span>\s*<span className="text-slate-800 dark:text-slate-200 text-sm font-black">\{fmt\(paymentChannelsTotal\)\}<\/span>\s*<\/CardTitle>\s*<\/CardHeader>\s*<CardContent className="p-3">([\s\S]*?)<\/CardContent>\s*<\/Card>/g,
  '<Panel title="Payment Channel Collections" amount={fmt(paymentChannelsTotal)} titleClass="text-slate-800 dark:text-slate-200">\n$1\n</Panel>'
);

// Bank Deposits
content = content.replace(
  /<Card className="card border bg-card bg-slate-50\/50 dark:bg-slate-900\/10">\s*<CardHeader className="py-3 bg-muted\/20 border-b">\s*<CardTitle className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">\s*Bank Deposits & Handovers\s*<\/CardTitle>\s*<\/CardHeader>\s*<CardContent className="p-3 space-y-2\.5 text-xs">([\s\S]*?)<\/CardContent>\s*<\/Card>/g,
  '<Panel title="Bank Deposits & Handovers" amount="">\n<div className="space-y-2.5 text-xs">\n$1\n</div>\n</Panel>'
);


fs.writeFileSync('d:\\dev\\acme\\acme-erp\\src\\routes\\_authenticated\\reports\\$id.tsx', content, 'utf8');
console.log("Script finished");
