using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	internal enum LineType
	{
		Blank,
		h1, h2, h3, h4, h5, h6,
		post_h1, post_h2,
		quote,
		ol,
		ul,
		plain,
		indent,
		hr,
		html,
	}

	public class Markdown
	{
		public Markdown()
		{
			Reset();
		}

		public string Transform(string str)
		{
			Reset();
			AddLines(str);
			return Render();
		}

		public void Reset()
		{
			// Create a line parser and blocks collection
			m_LineParser = new LineParser(this);
			m_Blocks = new Blocks();
		}

		public void AddLines(string str)
		{
			// Fix carriage returns
			str = str.Replace("\r\n", "\n");
			foreach (var line in str.Split('\n'))
			{
				AddLine(line);
			}
		}

		public void AddLine(string str)
		{
			// Add line as a new block
			m_Blocks.Add(m_LineParser.ProcessLine(str));
		}

		public string Render()
		{
			m_Blocks.Add(m_LineParser.Finish());

			// Process all blocks
			m_Blocks.Process(this);

			// Render all blocks
			StringBuilder b = new StringBuilder();
			m_Blocks.Render(this, b);

			// Done!
			return b.ToString();
		}

		// Overridable query to check if a tag is a block level tag or not.
		public virtual bool IsBlockTag(string tag)
		{
			for (int i = 0; i < m_BlockTags.Length; i++)
			{
				if (m_BlockTags[i].Equals(tag, StringComparison.InvariantCultureIgnoreCase))
					return true;
			}
			return false;
		}
		static string[] m_BlockTags = new string[] 
			{ "p", "div", "h[1-6]", "blockquote", "pre", "table", "dl", "ol", "ul", "script", "noscript", "form", "fieldset", "iframe", "math", "ins", "del" };

		internal Blocks m_Blocks;			// Internal so UnitTest can access
		LineParser m_LineParser;
	}

}
