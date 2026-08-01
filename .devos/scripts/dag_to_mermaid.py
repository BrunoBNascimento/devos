import json
import sys

def convert_dag_to_mermaid(dag):
    mermaid = ["graph TD"]
    
    nodes = dag.get('nodes', [])
    edges = dag.get('edges', [])
    
    for node in nodes:
        node_id = node.get('id', '')
        node_label = node.get('label', node_id)
        mermaid.append(f'    {node_id}["{node_label}"]')
        
    for edge in edges:
        source = edge.get('source')
        target = edge.get('target')
        mermaid.append(f'    {source} --> {target}')
        
    return "\n".join(mermaid)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python dag_to_mermaid.py <dag_json_file>")
        sys.exit(1)
        
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        dag = json.load(f)
        
    print(convert_dag_to_mermaid(dag))
