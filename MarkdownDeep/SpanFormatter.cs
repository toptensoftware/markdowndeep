using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	internal enum TokenType
	{
		Text,			// Plain text, should be htmlencoded
		HtmlTag,		// Valid html tag, write out directly but escape &amps;
		Html,			// Valid html entity, write out directly

		open_em,		// Opening em
		close_em,		// Closing em
		open_strong,	// Opening strong
		close_strong,	// Closing strong
		code_span,		// <code></code>
		br,				// <br />
		link,			// <a href>, data = LinkInfo
		img,			// <img>, data = LinkInfo

		Count,
	}

	internal class Token
	{
		public Token(TokenType type, int startOffset, int length)
		{
			this.type = type;
			this.startOffset = startOffset;
			this.length = length;
		}

		public Token(TokenType type, object data)
		{
			this.type = type;
			this.data = data;
		}

		public TokenType type;
		public int startOffset;
		public int length;
		public object data;
	}

	internal class SpanFormatter : StringParser
	{
		public SpanFormatter(Markdown m)
		{
			m_Markdown = m;
		}

		internal void Format(StringBuilder dest, string str)
		{
			base.Reset(str);

			// Parse the string into a list of tokens
			List<Token> tokens=ParseTokens();
			if (tokens == null)
			{
				dest.Append(str);
			}
			else
			{
				// Now build the string
				BuildFinalString(dest, str, tokens);
			}
		}

		internal string Format(string str)
		{
			StringBuilder dest = new StringBuilder();
			Format(dest, str);
			return dest.ToString();
		}

		private string BuildFinalString(StringBuilder sb, string str, List<Token> tokens)
		{
			foreach (Token t in tokens)
			{
				switch (t.type)
				{
					case TokenType.Text:
						// Append encoded text
						m_Markdown.HtmlEncode(sb, str.Substring(t.startOffset, t.length));
						break;

					case TokenType.HtmlTag:
						// Append html as is
						Utils.SmartHtmlEncodeAmps(sb, str.Substring(t.startOffset, t.length));
						break;

					case TokenType.Html:
						// Append html as is
						sb.Append(str, t.startOffset, t.length);
						break;

					case TokenType.br:
						sb.Append("<br />\n");
						break;

					case TokenType.open_em:
						sb.Append("<em>");
						break;

					case TokenType.close_em:
						sb.Append("</em>");
						break;

					case TokenType.open_strong:
						sb.Append("<strong>");
						break;

					case TokenType.close_strong:
						sb.Append("</strong>");
						break;

					case TokenType.code_span:
						sb.Append("<code>");
						m_Markdown.HtmlEncode(sb, str.Substring(t.startOffset, t.length));
						sb.Append("</code>");
						break;

					case TokenType.link:
					{
						LinkInfo li = (LinkInfo)t.data;
						li.def.RenderLink(m_Markdown, sb, li.link_text);
						break;
					}

					case TokenType.img:
					{
						LinkInfo li = (LinkInfo)t.data;
						li.def.RenderImg(m_Markdown, sb, li.link_text);
						break;
					}
				}
			}

			// Done
			return sb.ToString();
		}

		static char[] m_specialChars = new char[] { ' ', '*', '_', '`', '<', '&', '\\', '[', '!' };


		public List<Token> ParseTokens()
		{
			List<Token> tokens = null;

			Token prev_single_star = null;
			Token prev_double_star = null;
			Token prev_single_under = null;
			Token prev_double_under = null;

			while (!eof)
			{
				int savepos = position;

				// Find the next special character
				if (!FindAny(m_specialChars))
					SkipToEnd();

				// Special handling for space
				// We don't want to create a token for every space, but we
				// do need to find "  \n" sequences to replace with br tags
				while  (current == ' ')
				{
					// Is this a "  \n"
					if (DoesMatch("  \n"))
						break;

					// Nope, look again
					Skip(1);
					if (!FindAny(m_specialChars))
						SkipToEnd();
				}

				// Did we reach the end?
				if (eof)
				{
					if (tokens == null)
						return null;

					tokens.Add(new Token(TokenType.Text, savepos, end_position-savepos));
					return tokens;
				}


				// Create token list
				if (tokens == null)
				{
					tokens = new List<Token>();
				}

				// Create a token for everything up to the special character
				if (position > savepos)
				{
					tokens.Add(new Token(TokenType.Text, savepos, position - savepos));
				}

				// Work out token
				Token token = null;
				switch (current)
				{
					case '*':
						token = ProcessEmphasis(ref prev_single_star, ref prev_double_star);
						break;

					case '_':
						token = ProcessEmphasis(ref prev_single_under, ref prev_double_under);
						break;

					case '`':
						token = ProcessCodeSpan();
						break;

					case '[':
					case '!':
					{
						// Process link reference
						int linkpos = position;
						token = ProcessLinkOrImage();

						// Rewind if not found
						if (token == null)
							position = linkpos;
					}
						break;

					case '<':
					{
						// Is it a valid html tag?
						int save = position;
						HtmlTag tag = HtmlTag.Parse(this);
						if (tag != null)
						{
							token = new Token(TokenType.HtmlTag, save, position - save);
						}
						else
						{
							position = save;
							// Is it a valid auto link?
							token = ProcessAutoLink();

							if (token == null)
								position = save;
						}
						break;
					}

					case '&':
					{
						// Is it a valid html entity
						int save=position;
						string unused=null;
						if (SkipHtmlEntity(ref unused))
						{
							token = new Token(TokenType.Html, save, position - save);
						}

						break;
					}

					case ' ':
					{
						Skip(3);
						token = new Token(TokenType.br, savepos, 3);
						break;
					}

					case '\\':
					{
						switch (CharAtOffset(1))
						{
							case '\\':
							case '`':
							case '*':
							case '_':
							case '{':
							case '}':
							case '[':
							case ']':
							case '(':
							case ')':
							case '#':
							case '+':
							case '-':
							case '.':
							case '!':
								token = new Token(TokenType.Html, position+1, 1);
								Skip(2);
								break;
						}
						break;
					}
				}


				if (token==null)
				{
					token = new Token(TokenType.Text, position, 1);
					Skip(1);
				}

				tokens.Add(token);
			}
			return tokens;
		}

		// Process '*', '**' or '_', '__'
		public Token ProcessEmphasis(ref Token prev_single, ref Token prev_double)
		{
			// Check whitespace before/after
			bool bSpaceBefore = !bof && IsLineSpace(CharAtOffset(-1));
			bool bSpaceAfter = IsLineSpace(CharAtOffset(1));

			// Ignore if surrounded by whitespace
			if (bSpaceBefore && bSpaceAfter)
			{
				return null;
			}

			// Save the current character
			char ch = current;

			// Skip it
			Skip(1);

			// Do we have a previous matching single star?
			if (!bSpaceBefore && prev_single != null)
			{
				// Yes, match them...
				prev_single.type = TokenType.open_em;
				prev_single = null;
				return new Token(TokenType.close_em, position - 1, 1);
			}

			// Is this a double star/under
			if (current == ch)
			{
				// Skip second character
				Skip(1);

				// Space after?
				bSpaceAfter = IsLineSpace(current);

				// Space both sides?
				if (bSpaceBefore && bSpaceAfter)
				{
					// Ignore it
					return new Token(TokenType.Text, position - 2, 2);
				}

				// Do we have a previous matching double
				if (!bSpaceBefore && prev_double != null)
				{
					// Yes, match them
					prev_double.type = TokenType.open_strong;
					prev_double = null;
					return new Token(TokenType.close_strong, position - 2, 2);
				}

				if (!bSpaceAfter)
				{
					// Opening double star
					prev_double = new Token(TokenType.Text, position - 2, 2);
					return prev_double;
				}

				// Ignore it
				return new Token(TokenType.Text, position - 2, 2);
			}

			// If there's a space before, we can open em
			if (!bSpaceAfter)
			{
				// Opening single star
				prev_single = new Token(TokenType.Text, position - 1, 1);
				return prev_single;
			}

			// Ignore
			Skip(-1);
			return null;
		}

		Token ProcessAutoLink()
		{
			// Skip the angle bracket
			Skip(1);

			Mark();

			// Must start with one of these
			if (!Skip("https://") && !Skip("http://") && !Skip("ftp://"))
				return null;

			// Now we allow anything except whitespace and quotes up to the closing angle
			while (!eof)
			{
				char ch = current;

				if (ch=='>')
				{
					string url=Extract();
					LinkInfo li = new LinkInfo(new LinkDefinition("auto", url, null), url);
					Skip(1);
					return new Token(TokenType.link, li);
				}

				if (char.IsWhiteSpace(ch) || ch == '\"' || ch == '\'')
					return null;

				Skip(1);
			}

			return null;
		}

		Token ProcessLinkOrImage()
		{
			// Is this an image reference?
			TokenType token_type = Skip('!') ? TokenType.img : TokenType.link;

			// Opening '['
			if (!Skip('['))
				return null;

			// Find the closing angle bracket
			Mark();
			if (!Find(']'))
			{
				// Bad definition, no closing bracket
				return null;
			}

			// Get the link text
			string link_text = Extract();

			// Skip the closing ']'
			Skip(1);

			int savepos = position;

			SkipWhitespace();

			if (Skip('('))
			{
				var link_def = LinkDefinition.ParseLinkTarget(this, "inline");
				if (link_def==null)
					return null;

				SkipWhitespace();

				if (!Skip(')'))
					return null;

				return new Token(token_type, new LinkInfo(link_def, link_text));
			}
			else
			{
				position = savepos;
				SkipWhitespace();
			}

			// Reference link?
			string link_id = null;
			if (current == '[')
			{
				// Skip the opening '['
				Skip(1);

				// Find the start/end of the id
				Mark();
				if (!Find(']'))
					return null;

				// Extract the id
				link_id = Extract();

				// Skip closing ']'
				Skip(1);
			}
			else
			{
				// Rewind to just after the closing ']'
				position = savepos;
			}

			// Link id not specified?
			if (string.IsNullOrEmpty(link_id))
			{
				link_id = link_text;

				// If the link text has carriage returns, try to normalize
				// to spaces
				if (link_id.Contains('\n'))
				{
					while (link_id.Contains(" \n"))
						link_id = link_id.Replace(" \n", "\n");
					link_id = link_id.Replace("\n", " ");
				}
			}

			// Find the link definition
			var def = m_Markdown.GetLinkDefinition(link_id);
			if (def == null)
				return null;

			return new Token(token_type, new LinkInfo(def, link_text));
		}

		Token ProcessCodeSpan()
		{
			int start = position;

			// Count leading ticks
			int tickcount = 0;
			while (Skip('`'))
			{
				tickcount++;
			}

			// Skip optional leading space...
			Skip(' ');

			// End?
			if (eof)
				return new Token(TokenType.Text, start, position - start);

			int startofcode = position;

			// Find closing ticks
			if (!Find(Substring(start, tickcount)))
				return new Token(TokenType.Text, start, position - start);

			// Work out position after closing ticks
			int endpos = position + tickcount;

			// Find end of code
			while (CharAtOffset(-1) == ' ')
				Skip(-1);

			// Done!
			var ret=new Token(TokenType.code_span, startofcode, position - startofcode);

			// Jump after ticks
			position = endpos;

			return ret;
		}

		Markdown m_Markdown;
	}
}
