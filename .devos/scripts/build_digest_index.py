import os
import json
import glob
import re

def parse_frontmatter(content):
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if not match:
        return {}
    
    frontmatter_text = match.group(1)
    result = {}
    for line in frontmatter_text.split('\n'):
        if ':' in line:
            key, val = line.split(':', 1)
            result[key.strip()] = val.strip()
    return result

def build_index(digests_dir):
    index = []
    files = glob.glob(os.path.join(digests_dir, '*.md'))
    for f in files:
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
            fm = parse_frontmatter(content)
            if fm:
                fm['file'] = os.path.basename(f)
                index.append(fm)
    
    with open(os.path.join(digests_dir, 'index.json'), 'w', encoding='utf-8') as out:
        json.dump(index, out, indent=2)
    print(f"Built digest index for {len(index)} files.")

if __name__ == "__main__":
    build_index('.devos/memory/digests')
