using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{

	public class Markdown
	{
		// Constructor
		public Markdown()
		{
			m_StringBuilder = new StringBuilder();
			m_StringScanner = new StringScanner();
			m_SpanFormatter = new SpanFormatter(this);
			m_LinkDefinitions = new Dictionary<string, LinkDefinition>(StringComparer.CurrentCultureIgnoreCase);
			m_Footnotes = new Dictionary<string, Block>();
			m_UsedFootnotes = new List<Block>();
			m_UsedHeaderIDs = new Dictionary<string, bool>();
		}

		// Transform a string
		public string Transform(string str)
		{
			// Reset the list of link definitions
			m_LinkDefinitions.Clear();
			m_Footnotes.Clear();
			m_UsedFootnotes.Clear();
			m_UsedHeaderIDs.Clear();
			m_AbbreviationMap = null;
			m_AbbreviationList = null;

			// Process blocks
			List<Block> blocks = new BlockProcessor(this, MarkdownInHtml).Process(str);
			
			// Sort abbreviations by length, longest to shortest
			if (m_AbbreviationMap!=null)
			{
				m_AbbreviationList = new List<Abbreviation>();
				m_AbbreviationList.AddRange(m_AbbreviationMap.Values);
				m_AbbreviationList.Sort(
					delegate(Abbreviation a, Abbreviation b)
					{
						return b.Abbr.Length - a.Abbr.Length;
					}
				);
			}

			// Render
			StringBuilder sb = GetStringBuilder();
			foreach (var b in blocks)
				b.Render(this, sb);

			// Render footnotes
			if (m_UsedFootnotes.Count > 0)
			{

				sb.Append("\n<div class=\"footnotes\">\n");
				sb.Append("<hr />\n");
				sb.Append("<ol>\n");
				for (int i=0; i<m_UsedFootnotes.Count; i++)
				{
					var fn=m_UsedFootnotes[i];

					sb.Append("<li id=\"#fn:");
					sb.Append((string)fn.data);	// footnote id
					sb.Append("\">\n");


					// We need to get the return link appended to the last paragraph
					// in the footnote
					string strReturnLink = string.Format("<a href=\"#fnref:{0}\" rev=\"footnote\">&#8617;</a>", (string)fn.data);

					// Get the last child of the footnote
					var child = fn.children[fn.children.Count - 1];
					if (child.blockType == BlockType.p)
					{
						child.blockType = BlockType.p_footnote;
						child.data = strReturnLink;
					}
					else
					{
						child = CreateBlock();
						child.contentLen = 0;
						child.blockType = BlockType.p_footnote;
						child.data = strReturnLink;
						fn.children.Add(child);
					}


					fn.Render(this, sb);

					sb.Append("</li>\n");
				}
				sb.Append("</ol\n");
				sb.Append("</div>\n");
			}

			// Done
			return sb.ToString();
		}

		// Set to true to only allow whitelisted safe html tags
		public bool SafeMode
		{
			get;
			set;
		}

		// Set to true to allow extra features
		public bool ExtraMode
		{
			get;
			set;
		}

		public bool MarkdownInHtml
		{
			get;
			set;
		}

		public bool AutoHeadingIDs
		{
			get;
			set;
		}

		// Add a link definition
		public void AddLinkDefinition(LinkDefinition link)
		{
			// Store it
			m_LinkDefinitions[link.id]=link;
		}

		internal void AddFootnote(Block footnote)
		{
			m_Footnotes[(string)footnote.data] = footnote;
		}

		// Look up a footnote, claim it and return it's index (or -1 if not found)
		internal int ClaimFootnote(string id)
		{
			Block footnote;
			if (m_Footnotes.TryGetValue(id, out footnote))
			{
				// Move the foot note to the used footnote list
				m_UsedFootnotes.Add(footnote);
				m_Footnotes.Remove(id);

				// Return it's display index
				return m_UsedFootnotes.Count-1;
			}
			else
				return -1;
		}

		// Get a link definition
		public LinkDefinition GetLinkDefinition(string id)
		{
			LinkDefinition link;
			if (m_LinkDefinitions.TryGetValue(id, out link))
				return link;
			else
				return null;
		}

		internal void AddAbbreviation(string abbr, string title)
		{
			if (m_AbbreviationMap == null)
			{
				// First time
				m_AbbreviationMap = new Dictionary<string, Abbreviation>();
			}
			else if (m_AbbreviationMap.ContainsKey(abbr))
			{
				// Remove previous
				m_AbbreviationMap.Remove(abbr);
			}

			// Store abbreviation
			m_AbbreviationMap.Add(abbr, new Abbreviation(abbr, title));

		}

		internal List<Abbreviation> GetAbbreviations()
		{
			return m_AbbreviationList;
		}

		// HtmlEncode a range in a string to a specified string builder
		internal void HtmlEncode(StringBuilder dest, string str, int start, int len)
		{
			m_StringScanner.Reset(str, start, len);
			var p = m_StringScanner;
			while (!p.eof)
			{
				char ch = p.current;
				switch (ch)
				{
					case '&':
						dest.Append("&amp;");
						break;

					case '<':
						dest.Append("&lt;");
						break;

					case '>':
						dest.Append("&gt;");
						break;

					case '\"':
						dest.Append("&quot;");
						break;

					default:
						dest.Append(ch);
						break;
				}
				p.SkipForward(1);
			}
		}


		// HtmlEncode a string, also converting tabs to spaces (used by CodeBlocks)
		internal void HtmlEncodeAndConvertTabsToSpaces(StringBuilder dest, string str, int start, int len)
		{
			m_StringScanner.Reset(str, start, len);
			var p = m_StringScanner;
			int pos = 0;
			while (!p.eof)
			{
				char ch = p.current;
				switch (ch)
				{
					case '\t':
						dest.Append(' ');
						pos++;
						while ((pos % 4) != 0)
						{
							dest.Append(' ');
							pos++;
						}
						pos--;		// Compensate for the pos++ below
						break;

					case '\r':
					case '\n':
						dest.Append('\n');
						pos = 0;
						p.SkipEol();
						continue;

					case '&':
						dest.Append("&amp;");
						break;

					case '<':
						dest.Append("&lt;");
						break;

					case '>':
						dest.Append("&gt;");
						break;

					case '\"':
						dest.Append("&quot;");
						break;

					default:
						dest.Append(ch);
						break;
				}
				p.SkipForward(1);
				pos++;
			}
		}

		public string MakeUniqueHeaderID(string strHeaderText)
		{
			return MakeUniqueHeaderID(strHeaderText, 0, strHeaderText.Length);

		}

		public string MakeUniqueHeaderID(string strHeaderText, int startOffset, int length)
		{
			if (!AutoHeadingIDs)
				return null;

			// Extract a pandoc style cleaned header id from the header text
			string strBase=m_SpanFormatter.MakeID(strHeaderText, startOffset, length);

			// If nothing left, use "section"
			if (String.IsNullOrEmpty(strBase))
				strBase = "section";

			// Make sure it's unique by append -n counter
			string strWithSuffix=strBase;
			int counter=1;
			while (m_UsedHeaderIDs.ContainsKey(strWithSuffix))
			{
				strWithSuffix = strBase + "-" + counter.ToString();
				counter++;
			}

			// Store it
			m_UsedHeaderIDs.Add(strWithSuffix, true);

			// Return it
			return strWithSuffix;
		}


		/*
		 * Get this markdown processors string builder.  
		 * 
		 * We re-use the same string builder whenever we can for performance.  
		 * We just reset the length before starting to / use it again, which 
		 * hopefully should keep the memory around for next time.
		 * 
		 * Note, care should be taken when using this string builder to not
		 * call out to another function that also uses it.
		 */
		public StringBuilder GetStringBuilder()
		{
			m_StringBuilder.Length = 0;
			return m_StringBuilder;
		}


		/*
		 * Process a span of text to the specified destination string buffer
		 */
		internal void processSpan(StringBuilder sb, string str, int start, int len)
		{
			m_SpanFormatter.Format(sb, str, start, len);
		}

		internal void processSpan(StringBuilder sb, string str)
		{
			m_SpanFormatter.Format(sb, str, 0, str.Length);
		}

		#region Block Pooling

		// We cache and re-use blocks for performance

		Stack<Block> m_SpareBlocks=new Stack<Block>();

		internal Block CreateBlock()
		{
			if (m_SpareBlocks.Count!=0)
				return m_SpareBlocks.Pop();
			else
				return new Block();
		}

		internal void FreeBlock(Block b)
		{
			m_SpareBlocks.Push(b);
		}

		#endregion

		// Attributes
		StringBuilder m_StringBuilder;
		StringScanner m_StringScanner;
		SpanFormatter m_SpanFormatter;
		Dictionary<string, LinkDefinition> m_LinkDefinitions;
		Dictionary<string, Block> m_Footnotes;
		List<Block> m_UsedFootnotes;
		Dictionary<string, bool> m_UsedHeaderIDs;
		Dictionary<string, Abbreviation> m_AbbreviationMap;
		List<Abbreviation> m_AbbreviationList;
	
	}

}
