import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Deep reference for generative engines. Mirrors app/llms.txt/route.js.
export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'llms-full.txt');
  const content = fs.readFileSync(filePath, 'utf8');
  return new NextResponse(content, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
