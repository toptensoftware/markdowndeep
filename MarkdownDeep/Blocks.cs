using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Diagnostics;

namespace MarkdownDeep
{
	class Blocks : List<Block>
	{
		/*
		 * Process - process all child blocks, collapsing paragraphs, lists, codeblocks, block quotes etc...
		 */
		internal void Process(Markdown m)
		{
			JoinParagraphs();
			ExtractLinkDefinitions(m);
			BuildLists(m);
			BuildCodeBlocks(m);
			BuildBlockQuotes(m);
			BuildSetExtHeaders(m);
			RemoveBlankLines();
		}

		// Add a child block, overridden to not add null blocks
		public new void Add(Block block)
		{
			if (block != null)
			{
				base.Add(block);
			}
		}

		/*
		 * Run through all child blocks and join consecutive paragraphs together
		 * 
		 * If a line is a plain or indented line, and previous line is a quote, ol, ul, or plain, join it
		 * but appending the line's content to the previous line's content
		 * 
		 * Basically we're just undoing the line splitting.
		 */
		private void JoinParagraphs()
		{
			// First, join plain paragraph lines to previous
			for (int i = 1; i < Count; i++)
			{
				switch (this[i].m_LineType)
				{
					case LineType.ul:
					case LineType.ol:
						switch (this[i - 1].m_LineType)
						{
							case LineType.quote:
							case LineType.h1:
							case LineType.h2:
							case LineType.h3:
							case LineType.h4:
							case LineType.h5:
							case LineType.h6:
							case LineType.plain:
								this[i].RevertToPlain();
								this[i - 1].m_str += "\n" + this[i].m_str;
								this.RemoveAt(i);
								i--;
								break;
						}
						break;

					case LineType.plain:
						switch (this[i - 1].m_LineType)
						{
							case LineType.quote:
							case LineType.ol:
							case LineType.ul:
							case LineType.h1:
							case LineType.h2:
							case LineType.h3:
							case LineType.h4:
							case LineType.h5:
							case LineType.h6:
							case LineType.plain:
							case LineType.indent:
							case LineType.possible_linkdef:
								this[i].RevertToPlain();
								this[i - 1].m_str += "\n" + this[i].m_str;
								this.RemoveAt(i);
								i--;
								break;
						}
						break;

					case LineType.indent:
						switch (this[i - 1].m_LineType)
						{
							case LineType.quote:
							case LineType.ol:
							case LineType.ul:
							case LineType.h1:
							case LineType.h2:
							case LineType.h3:
							case LineType.h4:
							case LineType.h5:
							case LineType.h6:
							case LineType.plain:
							case LineType.possible_linkdef:
								this[i].RevertToPlain();
								this[i - 1].m_str += "\n" + this[i].m_str;
								this.RemoveAt(i);
								i--;
								break;
						}
						break;
				}
			}
		}

		private void ExtractLinkDefinitions(Markdown m)
		{
			for (int i = 0; i < Count; i++)
			{
				// Possible?
				if (this[i].m_LineType != LineType.possible_linkdef)
					continue;

				// Parse it
				var def = LinkDefinition.ParseLinkDefinition(this[i].m_str);

				// If parse failed, revert block back to a plain block
				if (def == null)
				{
					this[i].m_LineType = LineType.plain;
				}
				else
				{
					// Otherwise, store the link reference on the markdown object and 
					// remove the link
					m.AddLinkDefinition(def);
					this.RemoveAt(i);
					i--;
				}
			}
		}

		/*
		 * BuildLists - find consecutive list items and collapse to a ListBlock
		 * 
		 * List are a little complicated as we need to process two types of list items - simple and complex
		 * 
		 * - Simple list items are single line list items where the content isn't wrapped in a paragraph tag
		 * - Complex list items are multi-line and may contain entire markdown content including other lists, block quotes etc...
		 *
		 * A complex list item can be triggered by a blank line before or after the list item itself, but not before the first
		 * item and not after the last item.
		 * 
		 * The approach is this:
		 * 	 1. Find the first and last line in the entire ul/ol list range by looking for consecutive ranges of (ul/ol + indent + blank)
		 * 	 2. Remove the last blank line from the range
		 * 	 3. Create a complex list item for each range of lines that consists or more than one item, including blanks before/after.
		 *
		 * This function does step 1 while the BuildList() function below does steps 2 and 3.
		 */
		private void BuildLists(Markdown m)
		{
			// Find the start and end of each li or ul set of items
			int start = -1;
			for (int i = 0; i < Count; i++)
			{
				switch (this[i].m_LineType)
				{
					case LineType.indent:
					case LineType.Blank:
						// These are allowed in a list
						continue;

					case LineType.ul:
					case LineType.ol:
						if (start >= 0)
						{
							// Different type of list?
							if (this[i].m_LineType != this[start].m_LineType)
							{
								// Create the list
								i = BuildList(m, start, i - 1);
								start = i;
								i--;	// Compensate for loop increment
							}
						}
						else
						{
							// Start of a new list
							start = i;
						}
						break;

					default:
						if (start >= 0)
						{
							i=BuildList(m, start, i - 1);
							i--;	// Compensate for loop increment
							start = -1;
						}
						break;
				}
			}

			// Trailing list?
			if (start >= 0)
			{
				BuildList(m, start, Count - 1);
			}
		}

		/* 
		 * BuildList - build a single <ol> or <ul> list
		 * 
		 * Performs steps 2 and 3 from above
		 */
		private int BuildList(Markdown m, int start, int end)
		{
			int originalCount = end - start + 1;

			// First remove trailing blank lines (ie: Step 2)
			while (this[end].m_LineType == LineType.Blank)
				end--;

			// What sort of list are we dealing with
			LineType listType=this[start].m_LineType;
			Debug.Assert(listType == LineType.ul || listType == LineType.ol);

			// Create the wrapping list item
			var List=new ListBlock(listType);

			// Process all lines in the range		
			for (int i = start; i <= end; i++)
			{
				Debug.Assert(this[i].m_LineType == listType);

				// Find start of item, including leading blanks
				int start_of_li = i;
				while (start_of_li > start && this[start_of_li-1].m_LineType == LineType.Blank)
					start_of_li--;

				// Find end of the item, including trailing blanks
				int end_of_li = i;
				while (end_of_li < end && this[end_of_li+1].m_LineType != listType)
					end_of_li++;

				// Is this a simple or complex list item?
				if (start_of_li == end_of_li)
				{
					// It's a simple item
					Debug.Assert(start_of_li == i);
					List.m_childBlocks.Add(this[i]);
				}
				else
				{
					// Create a complex list item
					var lineParser = new LineParser(m);
					var item = new ComplexListItem(listType);
					for (int j = start_of_li; j <= end_of_li; j++)
					{
						item.m_childBlocks.Add(lineParser.ProcessLine(this[j].m_str));
					}

					// Process child items
					item.m_childBlocks.Process(m);

					// Add the complex item
					List.m_childBlocks.Add(item);
				}

				// Continue processing from end of li
				i = end_of_li;
			}

			// Remove the entire range and replace with the list
			this.RemoveRange(start, originalCount);
			this.Insert(start, List);

			// Continue processing after this item
			return start + 1;
		}

		/*
		 * BuildCodeBlocks - Find consecutive indented lines and collapse to a CodeBlock
		 */
		private void BuildCodeBlocks(Markdown m)
		{
			// Join all indented sections into code blocks
			int start = -1;
			for (int i = 0; i < Count; i++)
			{
				switch (this[i].m_LineType)
				{
					case LineType.indent:
						if (start < 0)
							start = i;
						break;

					case LineType.Blank:
						break;

					default:
						if (start >= 0)
						{
							Collapse(m, new CodeBlock(), start, i - 1, false);
							i = start;
							start = -1;
						}
						break;
				}
			}

			// Trailing code block?
			if (start >= 0)
			{
				Collapse(m, new CodeBlock(), start, Count - 1, false);
			}

		}


		/*
		 * BuildBlockQuotes - Find consecutive quoted lines and collapse to a QuoteBlock
		 */
		private void BuildBlockQuotes(Markdown m)
		{
			// Join all block quote sections
			int start = -1;
			for (int i = 0; i < Count; i++)
			{
				switch (this[i].m_LineType)
				{
					case LineType.quote:
						if (start < 0)
							start = i;
						break;

					case LineType.Blank:
						break;

					default:
						if (start >= 0)
						{
							Collapse(m, new QuoteBlock(), start, i - 1, true);
							start = -1;
							i = start;
						}
						break;
				}
			}

			if (start >= 0)
			{
				Collapse(m, new QuoteBlock(), start, Count - 1, true);
			}

		}

		/*
		 * Look for all post_h1 and post_h2 items and change preceeding paragraph
		 * to a heading
		 */
		private void BuildSetExtHeaders(Markdown m)
		{
			for (int i = 0; i < Count; i++)
			{
				if (this[i].m_LineType == LineType.post_h1 || this[i].m_LineType==LineType.post_h2)
				{
					// Do we have a paragraph to apply heading style to?
					if (i > 0 && this[i - 1].m_LineType == LineType.plain)
					{
						// Change preceeding paragraph to h1 or h2
						this[i - 1].m_LineType = LineType.h1 + (this[i].m_LineType - LineType.post_h1);

						// Remove this line
						RemoveAt(i);
						i--;
					}
					else
					{
						if (this[i].m_LineType == LineType.post_h2 && this[i].m_str.Length>=3)
						{
							// Change --- to horizontal rule
							this[i].m_LineType = LineType.hr;
						}
						else
						{
							this[i].m_LineType = LineType.plain;
						}
					}

				}
			}
		}

		/*
		 * Remove blank lines (not really necessary as we don't render them anyway)
		 */
		private void RemoveBlankLines()
		{
			// Remove all blank lines
			for (int i = Count - 1; i >= 0; i--)
			{
				if (this[i].m_LineType == LineType.Blank)
				{
					RemoveAt(i);
				}
			}
		}

		// Collapse a range of lines into a new parent block, optionally doing markdown processing on the new children
		internal void Collapse(Markdown m, ParentBlock parent, int start, int end, bool processChildren)
		{
			// Remember the original line count
			int originalCount = end - start + 1;

			// Don't include trailing blank lines
			while (this[end].m_LineType == LineType.Blank)
				end--;

			if (processChildren)
			{
				// Process children
				var lp = new LineParser(m);
				for (int i = start; i <= end; i++)
				{
					// Process the child line
					parent.m_childBlocks.Add(lp.ProcessLine(this[i].m_str));
				}

				parent.m_childBlocks.Add(lp.Finish());

				// Process child blocks
				parent.m_childBlocks.Process(m);
			}
			else
			{
				// Just collapse
				for (int i = start; i <= end; i++)
				{
					// Process the child line
					parent.m_childBlocks.Add(this[i]);
				}
			}

			// Remove original items and replace with new collapsed block
			RemoveRange(start, originalCount);
			this.Insert(start, parent);
		}

		internal void Render(Markdown m, StringBuilder b)
		{
			foreach (var block in this)
			{
				block.Render(m, b);
			}
		}
	}
}
