const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  swift: 'swift',
  cs: 'csharp',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  c: 'c',
  h: 'c',
  hpp: 'cpp',
  rs: 'rust',
  php: 'php',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  yaml: 'yaml',
  yml: 'yaml',
  json: 'json',
  md: 'markdown',
  mdx: 'markdown',
  sql: 'sql',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  tf: 'terraform',
  hcl: 'hcl',
  toml: 'toml',
  xml: 'xml',
  vue: 'vue',
  svelte: 'svelte',
  ex: 'elixir',
  exs: 'elixir',
  erl: 'erlang',
  hs: 'haskell',
  lua: 'lua',
  r: 'r',
  dart: 'dart',
};

/**
 * Detects the programming language from a file path based on its extension
 * or special filename.
 */
export function detectLanguage(filePath: string): string | undefined {
  if (!filePath) return undefined;

  const fileName = filePath.split('/').pop()?.toLowerCase() ?? '';

  // Handle exact filename matches
  if (fileName === 'dockerfile') return 'dockerfile';
  if (fileName === 'makefile') return 'makefile';
  if (fileName === '.gitignore') return 'gitignore';
  if (fileName === '.env' || fileName.startsWith('.env.')) return 'dotenv';

  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1) return undefined;

  const ext = fileName.slice(dotIndex + 1);
  return EXTENSION_TO_LANGUAGE[ext];
}

/**
 * Annotates a unified diff with line numbers from both old and new files.
 * Each diff line is prefixed with [oldLine:newLine] to help LLMs provide
 * accurate inline comments.
 */
export function annotateDiffWithLineNumbers(diff: string): string {
  const lines = diff.split('\n');
  const annotated: string[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      oldLine = parseInt(hunkMatch[1], 10);
      newLine = parseInt(hunkMatch[2], 10);
      annotated.push(line);
      continue;
    }

    // Skip file header lines (---, +++, diff, index, etc.)
    if (
      line.startsWith('---') ||
      line.startsWith('+++') ||
      line.startsWith('diff ') ||
      line.startsWith('index ') ||
      line.startsWith('new file ') ||
      line.startsWith('deleted file ') ||
      line.startsWith('Binary files')
    ) {
      annotated.push(line);
      continue;
    }

    // Handle diff lines
    if (line.startsWith('-')) {
      // Deleted line: exists in old file only
      annotated.push(`[${oldLine}:-] ${line}`);
      oldLine++;
    } else if (line.startsWith('+')) {
      // Added line: exists in new file only
      annotated.push(`[-:${newLine}] ${line}`);
      newLine++;
    } else if (line.startsWith(' ')) {
      // Context line: exists in both files
      annotated.push(`[${oldLine}:${newLine}] ${line}`);
      oldLine++;
      newLine++;
    } else {
      // Keep other lines as-is (empty lines, etc.)
      annotated.push(line);
    }
  }

  return annotated.join('\n');
}
