import json
import os
import argparse
from datetime import datetime

def format_timestamp(ts):
    try:
        return datetime.fromtimestamp(float(ts)).strftime('%Y-%m-%d %H:%M:%S')
    except:
        return str(ts)

def process_messages(messages, output_file):
    with open(output_file, 'w', encoding='utf-8') as f:
        for msg in messages:
            user = msg.get('user', 'Unknown')
            text = msg.get('text', '')
            ts = format_timestamp(msg.get('ts', 0))
            
            f.write(f"**{user}** at {ts}:\n")
            f.write(f"{text}\n\n")
            
            if 'attachments' in msg:
                f.write("Attachments:\n")
                for att in msg['attachments']:
                    title = att.get('title', 'Attachment')
                    link = att.get('title_link', '')
                    f.write(f"- [{title}]({link})\n")
                f.write("\n")
                
            if 'reactions' in msg:
                reactions = [f":{r['name']}: ({r['count']})" for r in msg['reactions']]
                f.write("Reactions: " + ", ".join(reactions) + "\n\n")

def parse_slack_export(input_file, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    if isinstance(data, list):
        process_messages(data, os.path.join(output_dir, "slack_export.md"))
    print(f"Parsed Slack export to {output_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input_file")
    parser.add_argument("output_dir")
    args = parser.parse_args()
    parse_slack_export(args.input_file, args.output_dir)
