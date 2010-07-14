using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	public class BlockProcessor : StringParser
	{
		public BlockProcessor(Markdown m)
		{
			m_markdown = m;
			m_parentType = BlockType.Blank;
		}

		internal BlockProcessor(Markdown m, BlockType parentType)
		{
			m_markdown = m;
			m_parentType = parentType;
		}

		internal List<Block> Process(string str)
		{
			return ParseLines(str);
		}

		internal List<Block> ParseLines(string str)
		{
			// Reset string parser
			Reset(str);

			// The final set of blocks will be collected here
			var blocks = new List<Block>();

			// The current paragraph/list/codeblock etc will be accumulated here
			// before being collapsed into a block and store in above `blocks` list
			var lines = new List<Block>();

			// Add all blocks
			while (!eof)
			{
				// Get the next line
				var b = EvaluateLine();

				// SetExt header?
				if (b.blockType == BlockType.post_h1 || b.blockType == BlockType.post_h2)
				{
					if (lines.Count > 0)
					{
						// Remove the previous line and collapse the current paragraph
						var prevline = lines.Pop();
						CollapseLines(blocks, lines);

						// If previous line was blank, 
						if (prevline.blockType != BlockType.Blank)
						{
							// Convert the previous line to a heading and add to block list
							prevline.RevertToPlain();
							prevline.blockType = b.blockType == BlockType.post_h1 ? BlockType.h1 : BlockType.h2;
							blocks.Add(prevline);
							continue;
						}
					}

					// Couldn't apply setext header to a previous line

					if (b.blockType == BlockType.post_h1)
					{
						// `===` gets converted to normal paragraph
						b.RevertToPlain();
						lines.Add(b);
					}
					else
					{
						// `---` gets converted to hr
						if (b.contentLen >= 3)
						{
							b.blockType = BlockType.hr;
							blocks.Add(b);
						}
						else
						{
							b.RevertToPlain();
							lines.Add(b);
						}
					}

					continue;
				}


				// Work out the current paragraph type
				BlockType currentBlockType = lines.Count > 0 ? lines[0].blockType : BlockType.Blank;

				// Process this line
				switch (b.blockType)
				{
					case BlockType.Blank:
						switch (currentBlockType)
						{
							case BlockType.Blank:
								FreeBlock(b);
								break;

							case BlockType.p:
								CollapseLines(blocks, lines);
								FreeBlock(b);
								break;

							case BlockType.quote:
							case BlockType.ol_li:
							case BlockType.ul_li:
							case BlockType.indent:
								lines.Add(b);
								break;

							default:
								System.Diagnostics.Debug.Assert(false);
								break;
						}
						break;

					case BlockType.p:
						switch (currentBlockType)
						{
							case BlockType.Blank:
							case BlockType.p:
								lines.Add(b);
								break;

							case BlockType.quote:
							case BlockType.ol_li:
							case BlockType.ul_li:
								var prevline = lines.Last();
								if (prevline.blockType == BlockType.Blank)
								{
									CollapseLines(blocks, lines);
									lines.Add(b);
								}
								else
								{
									lines.Add(b);
								}
								break;

							case BlockType.indent:
								CollapseLines(blocks, lines);
								lines.Add(b);
								break;

							default:
								System.Diagnostics.Debug.Assert(false);
								break;
						}
						break;

					case BlockType.indent:
						switch (currentBlockType)
						{
							case BlockType.Blank:
								// Start a code block
								lines.Add(b);
								break;

							case BlockType.p:
							case BlockType.quote:
								var prevline = lines.Last();
								if (prevline.blockType == BlockType.Blank)
								{
									// Start a code block after a paragraph
									CollapseLines(blocks, lines);
									lines.Add(b);
								}
								else
								{
									// indented line in paragraph, just continue it
									b.RevertToPlain();
									lines.Add(b);
								}
								break;


							case BlockType.ol_li:
							case BlockType.ul_li:
							case BlockType.indent:
								lines.Add(b);
								break;

							default:
								System.Diagnostics.Debug.Assert(false);
								break;
						}
						break;

					case BlockType.quote:
						if (currentBlockType != BlockType.quote)
						{
							CollapseLines(blocks, lines);
						}
						lines.Add(b);
						break;

					case BlockType.ol_li:
					case BlockType.ul_li:
						switch (currentBlockType)
						{
							case BlockType.Blank:
								lines.Add(b);
								break;

							case BlockType.p:
							case BlockType.quote:
								var prevline = lines.Last();
								if (prevline.blockType == BlockType.Blank || m_parentType==BlockType.ol_li || m_parentType==BlockType.ul_li)
								{
									// List starting after blank line after paragraph or quote
									CollapseLines(blocks, lines);
									lines.Add(b);
								}
								else
								{
									// List's can't start in middle of a paragraph
									b.RevertToPlain();
									lines.Add(b);
								}
								break;

							case BlockType.ol_li:
							case BlockType.ul_li:
								if (b.blockType != currentBlockType)
								{
									CollapseLines(blocks, lines);
								}
								lines.Add(b);
								break;

							case BlockType.indent:
								// List after code block
								CollapseLines(blocks, lines);
								lines.Add(b);
								break;
						}
						break;

					case BlockType.h1:
					case BlockType.h2:
					case BlockType.h3:
					case BlockType.h4:
					case BlockType.h5:
					case BlockType.h6:
					case BlockType.html:
					case BlockType.hr:
						CollapseLines(blocks, lines);
						blocks.Add(b);
						break;

					default:
						System.Diagnostics.Debug.Assert(false);
						break;
				}
			}

			CollapseLines(blocks, lines);

			return blocks;
		}

		internal Block CreateBlock()
		{
			return m_markdown.CreateBlock();
		}

		internal void FreeBlock(Block b)
		{
			m_markdown.FreeBlock(b);
		}

		internal void FreeBlocks(List<Block> blocks)
		{
			foreach (var b in blocks)
				FreeBlock(b);
			blocks.Clear();
		}

		internal string RenderLines(List<Block> lines)
		{
			StringBuilder b = m_markdown.GetStringBuilder();
			foreach (var l in lines)
			{
				b.Append(l.buf, l.contentStart, l.contentLen);
				b.Append('\n');
			}
			return b.ToString();
		}

		internal void CollapseLines(List<Block> blocks, List<Block> lines)
		{
			// Remove trailing blank lines
			while (lines.Count>0 && lines.Last().blockType == BlockType.Blank)
			{
				FreeBlock(lines.Pop());
			}

			// Quit if empty
			if (lines.Count == 0)
			{
				return;
			}


			// What sort of block?
			switch (lines[0].blockType)
			{
				case BlockType.p:
				{
					// Collapse all lines into a single paragraph
					var para = CreateBlock();
					para.blockType = BlockType.p;
					para.buf = lines[0].buf;
					para.contentStart = lines[0].contentStart;
					para.contentEnd = lines.Last().contentEnd;
					blocks.Add(para);
					FreeBlocks(lines);
					break;
				}

				case BlockType.quote:
				{
					// Create a new quote block
					var quote = new Block(BlockType.quote);
					quote.m_childBlocks = new BlockProcessor(m_markdown, BlockType.quote).Process(RenderLines(lines));
					FreeBlocks(lines);
					blocks.Add(quote);
					break;
				}

				case BlockType.ol_li:
				case BlockType.ul_li:
					blocks.Add(BuildList(lines));
					break;

				case BlockType.indent:
				{
					var codeblock = new Block(BlockType.codeblock);
					codeblock.m_childBlocks = new List<Block>();
					codeblock.m_childBlocks.AddRange(lines);
					blocks.Add(codeblock);
					lines.Clear();
					break;
				}
			}
		}

		Block EvaluateLine()
		{
			// Create a block
			Block b=CreateBlock();

			// Store line start
			b.lineStart=position;
			b.buf=input;

			// Scan the line
			b.contentStart = position;
			int end = -1;
			b.blockType=EvaluateLine(ref b.contentStart, ref end);

			// Move to end of line
			SkipToEol();

			// If end of line not returned, do it automatically
			if (end < 0)
			{
				b.contentLen = position-b.contentStart;
			}
			else
			{
				b.contentLen = end-b.contentStart;
			}

			// Setup line length
			b.lineLen=position-b.lineStart;

			// Next line
			SkipEol();

			// Create block
			return b;
		}

		BlockType EvaluateLine(ref int start, ref int end)
		{
			// Empty line?
			if (eol)
				return BlockType.Blank;

			// Save start of line position
			int line_start= position;

			// ## Heading ##		
			char ch=current;
			if (ch == '#')
			{
				// Work out heading level
				int level = 1;
				SkipForward(1);
				while (current == '#')
				{
					level++;
					SkipForward(1);
				}

				// Limit of 6
				if (level > 6)
					level = 6;

				// Skip any whitespace
				SkipWhitespace();

				// Save start position
				start = position;

				// Jump to end and rewind over trailing hashes
				SkipToEol();
				while (CharAtOffset(-1) == '#')
				{
					SkipForward(-1);
				}

				// Rewind over trailing spaces
				while (char.IsWhiteSpace(CharAtOffset(-1)))
				{
					SkipForward(-1);
				}

				// Create the heading block
				end = position;

				SkipToEol();
				return BlockType.h1 + (level - 1);
			}

			// Check for entire line as - or = for setext h1 and h2
			if (ch=='-' || ch=='=')
			{
				// Skip all matching characters
				char chType = ch;
				while (current==chType)
				{
					SkipForward(1);
				}

				// Trailing whitespace allowed
				SkipLinespace();

				// If not at eol, must have found something other than setext header
				if (eol)
				{
					return chType == '=' ? BlockType.post_h1 : BlockType.post_h2;
				}

				position = line_start;
			}

			// Scan the leading whitespace, remembering how many spaces and where the first tab is
			int tabPos = -1;
			int leadingSpaces = 0;
			while (!eol)
			{
				if (current == ' ')
				{
					if (tabPos < 0)
						leadingSpaces++;
				}
				else if (current == '\t')
				{
					if (tabPos < 0)
						tabPos = position;
				}
				else
				{
					// Something else, get out
					break;
				}
				SkipForward(1);
			}

			// Blank line?
			if (eol)
			{
				end = start;
				return BlockType.Blank;
			}

			// 4 leading spaces?
			if (leadingSpaces >= 4)
			{
				start = line_start + 4;
				return BlockType.indent;
			}

			// Tab in the first 4 characters?
			if (tabPos >= 0 && tabPos - line_start<4)
			{
				start = tabPos + 1;
				return BlockType.indent;
			}

			// Treat start of line as after leading whitespace
			start = position;

			// Get the next character
			ch = current;

			// Html block?
			if (ch == '<')
			{
				// Parse html block
				if (ScanHtml())
				{
					end = position;
					return BlockType.html;
				}

				// Rewind
				position = start;
			}

			// Block quotes start with '>' and have one space or one tab following
			if (ch == '>')
			{
				// Block quote followed by space
				if (IsLineSpace(CharAtOffset(1)))
				{
					// Skip it and create quote block
					SkipForward(2);
					start = position;
					return BlockType.quote;
				}

				SkipForward(1);
				start = position;
				return BlockType.quote;
			}

			// Horizontal rule - a line consisting of 3 or more '-', '_' or '*' with optional spaces and nothing else
			if (ch == '-' || ch == '_' || ch == '*')
			{
				int count = 0;
				while (!eol)
				{
					char chType = current;
					if (current == ch)
					{
						count++;
						SkipForward(1);
						continue;
					}

					if (IsLineSpace(current))
					{
						SkipForward(1);
						continue;
					}

					break;
				}

				if (eol && count >= 3)
				{
					return BlockType.hr;
				}

				// Rewind
				position = start;
			}

			// Unordered list
			if ((ch == '*' || ch == '+' || ch == '-') && IsLineSpace(CharAtOffset(1)))
			{
				// Skip it
				SkipForward(1);
				SkipLinespace();
				start = position;
				return BlockType.ul_li;
			}

			// Ordered list
			if (char.IsDigit(ch))
			{
				// Ordered list?  A line starting with one or more digits, followed by a '.' and a space or tab

				// Skip all digits
				SkipForward(1);
				while (char.IsDigit(current))
					SkipForward(1);

				if (SkipChar('.') && SkipLinespace())
				{
					start = position;
					return BlockType.ol_li;
				}

				position=start;
			}

			// Reference link definition?
			if (ch == '[')
			{
				// Parse a link definition
				LinkDefinition l = LinkDefinition.ParseLinkDefinition(this);
				if (l!=null)
				{
					m_markdown.AddLinkDefinition(l);
					return BlockType.Blank;
				}
			}

			// Nothing special
			return BlockType.p;
		}

		internal bool ScanHtml()
		{
			// Parse a HTML tag
			HtmlTag openingTag = HtmlTag.Parse(this);
			if (openingTag == null)
				return false;

			// Closing tag?
			if (openingTag.closing)
				return false;

			// Closed tag, hr or comment?
			if (openingTag.name == "!" || openingTag.name.ToLower() == "hr" || openingTag.closed)
			{
				SkipLinespace();
				SkipEol();
				return true;
			}

			// Is it a block level tag?
			if (!openingTag.IsBlockTag())
				return false;


			// Now capture everything up to the closing tag and put it all in a single HTML block
			int depth = 1;

			while (!eof)
			{
				if (current != '<')
				{
					SkipForward(1);
					continue;
				}

				HtmlTag tag = HtmlTag.Parse(this);
				if (tag == null)
				{
					SkipForward(1);
					continue;
				}

				// Same tag?
				if (tag.name == openingTag.name && !tag.closed)
				{
					if (tag.closing)
					{
						depth--;
						if (depth == 0)
						{
							// End of tag?
							SkipLinespace();
							SkipEol();
							return true;
						}
					}
					else
					{
						depth++;
					}
				}
			}

			// Missing closing tag(s).  
			return false;
		}

		/*
		 * Spacing
		 * 
		 * 1-3 spaces - Promote to indented if more spaces than original item
		 * 

		/* 
		 * BuildList - build a single <ol> or <ul> list
		 */
		private Block BuildList(List<Block> lines)
		{
			// What sort of list are we dealing with
			BlockType listType = lines[0].blockType;
			System.Diagnostics.Debug.Assert(listType == BlockType.ul_li || listType == BlockType.ol_li);

			// Preprocess
			// 1. Collapse all plain lines (ie: handle hardwrapped lines)
			// 2. Promote any unindented lines that have more leading space 
			//    than the original list item to indented, including leading 
			//    specal chars
			int leadingSpace = lines[0].leadingSpaces;
			for (int i = 1; i < lines.Count; i++)
			{
				// Join plain paragraphs
				if ((lines[i].blockType == BlockType.p) && 
					(lines[i - 1].blockType == BlockType.p || lines[i-1].blockType==listType))
				{
					lines[i - 1].contentEnd = lines[i].contentEnd;
					FreeBlock(lines[i]);
					lines.RemoveAt(i);
					i--;
					continue;
				}

				if (lines[i].blockType != BlockType.indent && lines[i].blockType!=BlockType.Blank)
				{
					int thisLeadingSpace=lines[i].leadingSpaces;
					if (thisLeadingSpace > leadingSpace)
					{
						// Change line to indented, including original leading chars 
						// (eg: '* ', '>', '1.' etc...)
						lines[i].blockType = BlockType.indent;
						int saveend = lines[i].contentEnd;
						lines[i].contentStart = lines[i].lineStart + thisLeadingSpace;
						lines[i].contentEnd = saveend;
					}
				}
			}


			// Create the wrapping list item
			var List = new Block(listType == BlockType.ul_li ? BlockType.ul : BlockType.ol);
			List.m_childBlocks = new List<Block>();

			// Process all lines in the range		
			for (int i = 0; i < lines.Count; i++)
			{
				System.Diagnostics.Debug.Assert(lines[i].blockType == listType);

				// Find start of item, including leading blanks
				int start_of_li = i;
				while (start_of_li > 0 && lines[start_of_li - 1].blockType == BlockType.Blank)
					start_of_li--;

				// Find end of the item, including trailing blanks
				int end_of_li = i;
				while (end_of_li < lines.Count-1 && lines[end_of_li + 1].blockType != listType)
					end_of_li++;

				// Is this a simple or complex list item?
				if (start_of_li == end_of_li)
				{
					// It's a simple, single line item item
					System.Diagnostics.Debug.Assert(start_of_li == i);
					List.m_childBlocks.Add(CreateBlock().CopyFrom(lines[i]));
				}
				else
				{
					// Build a new string containing all child items
					bool bAnyBlanks = false;
					StringBuilder sb = m_markdown.GetStringBuilder();
					for (int j = start_of_li; j <= end_of_li; j++)
					{
						var l=lines[j];
						sb.Append(l.buf, l.contentStart, l.contentLen);
						sb.Append('\n');

						if (lines[j].blockType == BlockType.Blank)
						{
							bAnyBlanks = true;
						}
					}

					// Create the item and process child blocks
					var item = new Block(BlockType.li);
					item.m_childBlocks = new BlockProcessor(m_markdown, listType).Process(sb.ToString());

					// If no blank lines, change all contained paragraphs to plain text
					if (!bAnyBlanks)
					{
						foreach (var child in item.m_childBlocks)
						{
							if (child.blockType == BlockType.p)
							{
								child.blockType = BlockType.span;
							}
						}
					}

					// Add the complex item
					List.m_childBlocks.Add(item);
				}

				// Continue processing from end of li
				i = end_of_li;
			}

			FreeBlocks(lines);
			lines.Clear();

			// Continue processing after this item
			return List;
		}

		Markdown m_markdown;
		BlockType m_parentType;
	}
}
