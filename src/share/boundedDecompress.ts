/*
 * LZ-string URI decoder adapted to stop before exceeding the output budget.
 * Algorithm from lz-string, Copyright (c) 2013 pieroxy, MIT License.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
export function decompressBounded(input: string, maxChars: number): string | null {
  const encoded = input.replace(/ /g, '+');
  if (!encoded || /[^A-Za-z0-9+$-]/.test(encoded)) return null;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$';
  let index = 1;
  let value = alphabet.indexOf(encoded[0]);
  let position = 32;
  function readBits(count: number): number {
    let bits = 0;
    for (let bit = 0; bit < count; bit++) {
      if (value & position) bits += 2 ** bit;
      position >>= 1;
      if (!position) {
        position = 32;
        value = alphabet.indexOf(encoded.charAt(index++));
      }
    }
    return bits;
  }
  const first = readBits(2);
  if (first === 2) return '';
  if (first > 1 || maxChars < 1) return null;
  let previous = String.fromCharCode(readBits(first === 0 ? 8 : 16));
  const dictionary = ['', '', '', previous];
  const chunks = [previous];
  let outputLength = 1;
  let dictionarySize = 4;
  let bits = 3;
  let remaining = 4;
  while (index <= encoded.length) {
    let code = readBits(bits);
    if (code === 2) return chunks.join('');
    if (code === 0 || code === 1) {
      dictionary[dictionarySize++] = String.fromCharCode(readBits(code === 0 ? 8 : 16));
      code = dictionarySize - 1;
      remaining--;
    }
    if (!remaining) {
      remaining = 2 ** bits;
      bits++;
    }
    const entry =
      dictionary[code] || (code === dictionarySize ? previous + previous.charAt(0) : null);
    if (entry === null || outputLength + entry.length > maxChars) return null;
    outputLength += entry.length;
    chunks.push(entry);
    dictionary[dictionarySize++] = previous + entry.charAt(0);
    remaining--;
    previous = entry;
    if (!remaining) {
      remaining = 2 ** bits;
      bits++;
    }
  }
  return null;
}
