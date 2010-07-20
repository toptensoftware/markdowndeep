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
			m_UsedHeaderIDs = new Dictionary<string, bool>();
		}

		// Transform a string
		public string Transform(string str)
		{
			// Reset the list of link definitions
			m_LinkDefinitions.Clear();
			m_UsedHeaderIDs.Clear();

			// Process blocks
			List<Block> blocks = new BlockProcessor(this, MarkdownInHtml).Process(str);

			// Render
			StringBuilder sb = GetStringBuilder();
			foreach (var b in blocks)
				b.Render(this, sb);

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

		// Get a link definition
		public LinkDefinition GetLinkDefinition(string id)
		{
			LinkDefinition link;
			if (m_LinkDefinitions.TryGetValue(id, out link))
				return link;
			else
				return null;
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
		Dictionary<string, bool> m_UsedHeaderIDs;
	
	}

}
