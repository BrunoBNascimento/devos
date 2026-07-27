const fs = require('fs');
function parseMd(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = { filename: filePath.split(/[\\/]/).pop(), title: 'Untitled', summary: '', metadata: {} };
    
    // Extract frontmatter
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    let body = content;
    if (fmMatch) {
      body = content.substring(fmMatch[0].length);
      fmMatch[1].split('\n').forEach(line => {
        const idx = line.indexOf(':');
        if (idx > -1) {
          const key = line.substring(0, idx).trim();
          const val = line.substring(idx + 1).trim();
          parsed.metadata[key] = val;
        }
      });
    }

    // Extract title (first # or ## heading)
    const lines = body.split('\n');
    let foundTitle = false;
    let summaryLines = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!foundTitle && /^#{1,3}\s+(.*)/.test(trimmed)) {
        parsed.title = trimmed.match(/^#{1,3}\s+(.*)/)[1];
        foundTitle = true;
      } else if (foundTitle) {
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-') && !trimmed.startsWith('|')) {
          summaryLines.push(trimmed);
        } else if (summaryLines.length > 0) {
          break; // Stop after first paragraph
        }
      }
    }
    
    if (summaryLines.length) parsed.summary = summaryLines.join(' ');
    
    return parsed;
  } catch (err) {
    return null;
  }
}

console.log(parseMd('\\\\wsl.localhost\\Ubuntu\\home\\bruno_benicio\\devos\\.devos\\memory\\state\\setup_260726.md'));
