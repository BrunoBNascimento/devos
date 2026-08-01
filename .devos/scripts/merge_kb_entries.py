import os
import glob
import re
from difflib import SequenceMatcher

def parse_frontmatter(content):
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if not match:
        return {}
    
    frontmatter_text = match.group(1)
    result = {}
    for line in frontmatter_text.split('\n'):
        if ':' in line:
            key, val = line.split(':', 1)
            if key.strip() == 'tags':
                tags = [t.strip().strip('- ') for t in val.split(',')]
                result['tags'] = tags
            else:
                result[key.strip()] = val.strip()
    return result

def similar(a, b):
    return SequenceMatcher(None, a, b).ratio()

def scan_kb(kb_dir):
    entries = []
    files = glob.glob(os.path.join(kb_dir, '*.md'))
    for f in files:
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
            fm = parse_frontmatter(content)
            entries.append({
                'file': os.path.basename(f),
                'title': fm.get('title', os.path.basename(f)),
                'tags': set(fm.get('tags', []))
            })
            
    print("Potential merges report:")
    for i in range(len(entries)):
        for j in range(i+1, len(entries)):
            tag_overlap = entries[i]['tags'].intersection(entries[j]['tags'])
            title_sim = similar(entries[i]['title'], entries[j]['title'])
            
            if len(tag_overlap) > 1 or title_sim > 0.7:
                print(f"- {entries[i]['file']} and {entries[j]['file']} (Overlap tags: {len(tag_overlap)}, Title sim: {title_sim:.2f})")

if __name__ == "__main__":
    scan_kb('.devos/memory/brain_kb')
