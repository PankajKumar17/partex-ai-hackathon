import os
import re

def process_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Dark -> Light theme mappings
    content = content.replace('bg-surface/50', 'bg-slate-50')
    content = content.replace('bg-surface-light', 'bg-slate-50')
    content = content.replace('bg-surface-lighter', 'bg-slate-100')
    content = content.replace('border-surface-lighter', 'border-slate-200')
    content = content.replace('bg-surface', 'bg-white')
    
    # Text colors
    content = content.replace('text-white', 'TEMP_TEXT_DARK')
    content = content.replace('text-gray-200', 'text-slate-700')
    content = content.replace('text-gray-300', 'text-slate-600')
    content = content.replace('text-gray-400', 'text-slate-500')
    content = content.replace('text-gray-500', 'text-slate-500')
    
    # TEMP_TEXT_DARK defaults to text-slate-900, but keep white on colored backgrounds
    # Match patterns like: bg-primary ... TEMP_TEXT_DARK
    # Since buttons use bg-primary, bg-red-500 etc.
    content = content.replace('TEMP_TEXT_DARK', 'text-slate-900')
    
    # Hardcoded fixes for buttons that got broken
    content = content.replace('bg-primary hover:bg-primary-dark text-slate-900', 'bg-primary hover:bg-primary-dark text-white')
    content = content.replace('bg-red-500 hover:bg-red-600 pulse-record', 'bg-red-500 hover:bg-red-600 pulse-record text-white')
    content = content.replace('<Square className="w-6 h-6 text-slate-900" fill="white" />', '<Square className="w-6 h-6 text-white" fill="white" />')
    content = content.replace('<Mic className="w-7 h-7 text-slate-900" />', '<Mic className="w-7 h-7 text-white" />')
    content = content.replace('bg-primary hover:bg-primary-dark flex items-center justify-center transition-all duration-300 hover:scale-110 z-50', 'bg-primary hover:bg-primary-dark flex items-center justify-center transition-all duration-300 hover:scale-110 z-50 text-white')
    content = content.replace('bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50 text-slate-900', 'bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50 text-white')
    content = content.replace('bg-primary hover:bg-primary-dark text-white text-xs font-medium', 'bg-primary hover:bg-primary-dark text-white text-xs font-medium')
    content = content.replace('bg-primary hover:bg-primary-dark text-white font-medium', 'bg-primary hover:bg-primary-dark text-white font-medium')
    content = content.replace('<MessageCircle className="w-6 h-6 text-slate-900" />', '<MessageCircle className="w-6 h-6 text-white" />')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

src_dir = r"c:\Users\panka\OneDrive\Desktop\partex-hack\frontend\src"
for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith('.jsx'):
            process_file(os.path.join(root, f))
print("Theme strings replaced in JSX")
