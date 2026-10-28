import { File, FileCode2, FolderTree } from 'lucide-react';
import type { GraphNode } from '../graph/AtlasGraph';

export function FileTree({ nodes, selectedId, query, onSelect }: { nodes: GraphNode[]; selectedId: string; query: string; onSelect: (id: string) => void }) {
  const normalizedQuery = query.trim().toLowerCase();
  const files = nodes.filter((node) => !normalizedQuery || `${node.path} ${node.name}`.toLowerCase().includes(normalizedQuery));
  return (
    <section className="file-tree-panel" aria-labelledby="file-tree-title">
      <div className="rail-heading"><div><FolderTree size={15} /><h2 id="file-tree-title">Files</h2></div><span className="mono-count">{nodes.length}</span></div>
      <p className="rail-subtitle">Returned file nodes</p>
      {files.length ? (
        <ul className="file-tree-list" role="tree" aria-label="Repository files">
          {files.map((node) => {
            const depth = Math.min(node.path.split('/').length - 1, 4);
            return (
              <li role="none" key={node.id}>
                <button type="button" role="treeitem" aria-selected={selectedId === node.id} aria-label={`${node.path}, ${node.kind}`} className={`tree-item${selectedId === node.id ? ' is-selected' : ''}`} style={{ paddingInlineStart: `${14 + depth * 12}px` }} onClick={() => onSelect(node.id)}>
                  {node.kind === 'file' ? <FileCode2 size={14} /> : <File size={14} />}
                  <span className="tree-item-path">{node.path}</span>
                  <span className="tree-item-kind">{node.kind}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="tree-empty"><FolderTree size={19} /><p>{normalizedQuery ? 'No returned file paths match this filter.' : 'No file nodes were returned.'}</p></div>
      )}
    </section>
  );
}
