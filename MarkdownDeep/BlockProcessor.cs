using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	public class BlockProcessor : StringScanner
	{
		public BlockProcessor(Markdown m, bool MarkdownInHtml)
		{
			m_markdown = m;
			m_bMarkdownInHtml = MarkdownInHtml;
			m_parentType = BlockType.Blank;
		}

		internal BlockProcessor(Markdown m, bool MarkdownInHtml, BlockType parentType)
		{
			m_markdown = m;
			m_bMarkdownInHtml = MarkdownInHtml;
			m_parentType = parentType;
		}

		internal List<Block> Process(string str)
		{
			return ScanLines(str);
		}

		internal List<Block> ScanLines(string str)
		{
			// Reset string scanner
			Reset(str);
			return ScanLines();
		}

		internal List<Block> ScanLines(string str, int start, int len)
		{
			Reset(str, start, len);
			return ScanLines();
		}

		internal List<Block> ScanLines()
		{
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

					default:
						CollapseLines(blocks, lines);
						blocks.Add(b);
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
					quote.children = new BlockProcessor(m_markdown, m_bMarkdownInHtml, BlockType.quote).Process(RenderLines(lines));
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
					codeblock.children = new List<Block>();
					codeblock.children.AddRange(lines);
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
			b.contentLen = -1;
			b.blockType=EvaluateLine(b);

			// If end of line not returned, do it automatically
			if (b.contentLen < 0)
			{
				// Move to end of line
				SkipToEol();
				b.contentLen = position - b.contentStart;
			}

			// Setup line length
			b.lineLen=position-b.lineStart;

			// Next line
			SkipEol();

			// Create block
			return b;
		}

		BlockType EvaluateLine(Block b)
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
				b.contentStart = position;

				// Jump to end
				SkipToEol();

				// In extra mode, check for a trailing HTML ID
				if (m_markdown.ExtraMode && !m_markdown.SafeMode)
				{
					int end=position;
					string strID = Utils.StripHtmlID(input, b.contentStart, ref end);
					if (strID!=null)
					{
						b.data = strID;
						position = end;
					}
				}

				// Rewind over trailing hashes
				while (position>b.contentStart && CharAtOffset(-1) == '#')
				{
					SkipForward(-1);
				}

				// Rewind over trailing spaces
				while (position>b.contentStart && char.IsWhiteSpace(CharAtOffset(-1)))
				{
					SkipForward(-1);
				}

				// Create the heading block
				b.contentEnd = position;

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
				b.contentEnd = b.contentStart;
				return BlockType.Blank;
			}

			// 4 leading spaces?
			if (leadingSpaces >= 4)
			{
				b.contentStart = line_start + 4;
				return BlockType.indent;
			}

			// Tab in the first 4 characters?
			if (tabPos >= 0 && tabPos - line_start<4)
			{
				b.contentStart = tabPos + 1;
				return BlockType.indent;
			}

			// Treat start of line as after leading whitespace
			b.contentStart = position;

			// Get the next character
			ch = current;

			// Html block?
			if (ch == '<')
			{
				// Scan html block
				if (ScanHtml(b))
					return b.blockType;

				// Rewind
				position = b.contentStart;
			}

			// Block quotes start with '>' and have one space or one tab following
			if (ch == '>')
			{
				// Block quote followed by space
				if (IsLineSpace(CharAtOffset(1)))
				{
					// Skip it and create quote block
					SkipForward(2);
					b.contentStart = position;
					return BlockType.quote;
				}

				SkipForward(1);
				b.contentStart = position;
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
				position = b.contentStart;
			}

			// Unordered list
			if ((ch == '*' || ch == '+' || ch == '-') && IsLineSpace(CharAtOffset(1)))
			{
				// Skip it
				SkipForward(1);
				SkipLinespace();
				b.contentStart = position;
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
					b.contentStart = position;
					return BlockType.ol_li;
				}

				position=b.contentStart;
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

		internal enum MarkdownInHtmlMode
		{
			NA,			// No markdown attribute on the tag
			Block,		// markdown=1 or markdown=block
			Span,		// markdown=1 or markdown=span
			Deep,		// markdown=deep - recursive block mode
			Off,		// Markdown="something else"
		}

		internal MarkdownInHtmlMode GetMarkdownMode(HtmlTag tag)
		{
			// Get the markdown attribute
			string strMarkdownMode;
			if (!m_markdown.ExtraMode || !tag.attributes.TryGetValue("markdown", out strMarkdownMode))
			{
				if (m_bMarkdownInHtml)
					return MarkdownInHtmlMode.Deep;
				else
					return MarkdownInHtmlMode.NA;
			}

			// Remove it
			tag.attributes.Remove("markdown");

			// Parse mode
			if (strMarkdownMode == "1")
				return (tag.Flags & HtmlTagFlags.ContentAsSpan)!=0 ? MarkdownInHtmlMode.Span : MarkdownInHtmlMode.Block;

			if (strMarkdownMode == "block")
				return MarkdownInHtmlMode.Block;

			if (strMarkdownMode == "deep")
				return MarkdownInHtmlMode.Deep;

			if (strMarkdownMode == "span")
				return MarkdownInHtmlMode.Span;

			return MarkdownInHtmlMode.Off;
		}

		internal bool ProcessMarkdownEnabledHtml(Block b, HtmlTag openingTag, MarkdownInHtmlMode mode)
		{
			// Current position is just after the opening tag

			// Scan until we find matching closing tag
			int inner_pos = position;
			int depth = 1;
			bool bHasUnsafeContent = false;
			while (!eof)
			{
				// Find next angle bracket
				if (!Find('<'))
					break;

				// Is it a html tag?
				int tagpos = position;
				HtmlTag tag = HtmlTag.Parse(this);
				if (tag == null)
				{
					// Nope, skip it 
					SkipForward(1);
					continue;
				}

				// In markdown off mode, we need to check for unsafe tags
				if (m_markdown.SafeMode && mode == MarkdownInHtmlMode.Off && !bHasUnsafeContent)
				{
					if (!tag.IsSafe())
						bHasUnsafeContent = true;
				}

				// Ignore self closing tags
				if (tag.closed)
					continue;

				// Same tag?
				if (tag.name == openingTag.name)
				{
					if (tag.closing)
					{
						depth--;
						if (depth == 0)
						{
							// End of tag?
							SkipLinespace();
							SkipEol();

							b.blockType = BlockType.HtmlTag;
							b.data = openingTag;
							b.contentEnd = position;

							switch (mode)
							{
								case MarkdownInHtmlMode.Span:
								{
									Block span = this.CreateBlock();
									span.buf = input;
									span.blockType = BlockType.span;
									span.contentStart = inner_pos;
									span.contentLen = tagpos - inner_pos;

									b.children = new List<Block>();
									b.children.Add(span);
									break;
								}

								case MarkdownInHtmlMode.Block:
								case MarkdownInHtmlMode.Deep:
								{
									// Scan the internal content
									var bp = new BlockProcessor(m_markdown, mode == MarkdownInHtmlMode.Deep);
									b.children = bp.ScanLines(input, inner_pos, tagpos - inner_pos);
									break;
								}

								case MarkdownInHtmlMode.Off:
								{
									if (bHasUnsafeContent)
									{
										b.blockType = BlockType.unsafe_html;
										b.contentEnd = position;
									}
									else
									{
										Block span = this.CreateBlock();
										span.buf = input;
										span.blockType = BlockType.html;
										span.contentStart = inner_pos;
										span.contentLen = tagpos - inner_pos;

										b.children = new List<Block>();
										b.children.Add(span);
									}
									break;
								}
							}


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

		// Scan from the current position to the end of the html section
		internal bool ScanHtml(Block b)
		{
			// Remember start of html
			int posStartPiece = this.position;

			// Parse a HTML tag
			HtmlTag openingTag = HtmlTag.Parse(this);
			if (openingTag == null)
				return false;

			// Closing tag?
			if (openingTag.closing)
				return false;

			// Safe mode?
			bool bHasUnsafeContent = false;
			if (m_markdown.SafeMode && !openingTag.IsSafe())
				bHasUnsafeContent = true;

			HtmlTagFlags flags = openingTag.Flags;

			// Is it a block level tag?
			if ((flags & HtmlTagFlags.Block) == 0)
				return false;

			// Closed tag, hr or comment?
			if ((flags & HtmlTagFlags.NoClosing) != 0 || openingTag.closed)
			{
				SkipLinespace();
				SkipEol();

				b.contentEnd = position;
				b.blockType = bHasUnsafeContent ? BlockType.unsafe_html : BlockType.html;
				return true;
			}

			// Can it also be an inline tag?
			if ((flags & HtmlTagFlags.Inline) != 0)
			{
				// Yes, opening tag must be on a line by itself
				SkipLinespace();
				if (!eol)
					return false;
			}

			// Work out the markdown mode for this element
			if (m_markdown.ExtraMode)
			{
				MarkdownInHtmlMode MarkdownMode = this.GetMarkdownMode(openingTag);
				if (MarkdownMode != MarkdownInHtmlMode.NA)
				{
					return this.ProcessMarkdownEnabledHtml(b, openingTag, MarkdownMode);
				}
			}

			List<Block> childBlocks = null;

			// Now capture everything up to the closing tag and put it all in a single HTML block
			int depth = 1;

			while (!eof)
			{
				// Find next angle bracket
				if (!Find('<'))
					break;

				// Save position of current tag
				int posStartCurrentTag = position;

				// Is it a html tag?
				HtmlTag tag = HtmlTag.Parse(this);
				if (tag == null)
				{
					// Nope, skip it 
					SkipForward(1);
					continue;
				}

				// Safe mode checks
				if (m_markdown.SafeMode && !tag.IsSafe())
					bHasUnsafeContent = true;

				// Ignore self closing tags
				if (tag.closed)
					continue;

				// Markdown enabled content?
				if (!tag.closing && m_markdown.ExtraMode && !bHasUnsafeContent)
				{
					MarkdownInHtmlMode MarkdownMode = this.GetMarkdownMode(tag);
					if (MarkdownMode != MarkdownInHtmlMode.NA)
					{
						Block markdownBlock = this.CreateBlock();
						if (this.ProcessMarkdownEnabledHtml(markdownBlock, tag, MarkdownMode))
						{
							if (childBlocks==null)
							{
								childBlocks = new List<Block>();
							}

							// Create a block for everything before the markdown tag
							if (posStartCurrentTag > posStartPiece)
							{
								Block htmlBlock = this.CreateBlock();
								htmlBlock.buf = input;
								htmlBlock.blockType = BlockType.html;
								htmlBlock.contentStart = posStartPiece;
								htmlBlock.contentLen = posStartCurrentTag - posStartPiece;

								childBlocks.Add(htmlBlock);
							}

							// Add the markdown enabled child block
							childBlocks.Add(markdownBlock);

							// Remember start of the next piece
							posStartPiece = position;

							continue;
						}
						else
						{
							this.FreeBlock(markdownBlock);
						}
					}
				}
				
				// Same tag?
				if (tag.name == openingTag.name)
				{
					if (tag.closing)
					{
						depth--;
						if (depth == 0)
						{
							// End of tag?
							SkipLinespace();
							SkipEol();

							// If anything unsafe detected, just encode the whole block
							if (bHasUnsafeContent)
							{
								b.blockType = BlockType.unsafe_html;
								b.contentEnd = position;
								return true;
							}

							// Did we create any child blocks
							if (childBlocks != null)
							{
								// Create a block for the remainder
								if (position > posStartPiece)
								{
									Block htmlBlock = this.CreateBlock();
									htmlBlock.buf = input;
									htmlBlock.blockType = BlockType.html;
									htmlBlock.contentStart = posStartPiece;
									htmlBlock.contentLen = position - posStartPiece;

									childBlocks.Add(htmlBlock);
								}

								// Return a composite block
								b.blockType = BlockType.Composite;
								b.contentEnd = position;
								b.children = childBlocks;
								return true;
							}

							// Straight html block
							b.blockType = BlockType.html;
							b.contentEnd = position;
							return true;
						}
					}
					else
					{
						depth++;
					}
				}
			}

			// Rewind to just after the tag
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
			List.children = new List<Block>();

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
					List.children.Add(CreateBlock().CopyFrom(lines[i]));
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
					item.children = new BlockProcessor(m_markdown, m_bMarkdownInHtml, listType).Process(sb.ToString());

					// If no blank lines, change all contained paragraphs to plain text
					if (!bAnyBlanks)
					{
						foreach (var child in item.children)
						{
							if (child.blockType == BlockType.p)
							{
								child.blockType = BlockType.span;
							}
						}
					}

					// Add the complex item
					List.children.Add(item);
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
		bool m_bMarkdownInHtml;
	}
}
