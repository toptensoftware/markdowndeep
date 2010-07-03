using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	static class Utils
	{
		public static bool ParseIdentifier(string str, ref int pos, ref string identifer)
		{
			if (pos >= str.Length)
				return false;

			// Must start with a letter or underscore
			if (!char.IsLetter(str[pos]) && str[pos] != '_')
			{
				return false;
			}

			// Find the end
			int startpos = pos;
			pos++;
			while (pos < str.Length && (char.IsDigit(str[pos]) || char.IsLetter(str[pos]) || str[pos] == '_'))
				pos++;

			// Return it
			identifer = str.Substring(startpos, pos - startpos);
			return true;
		}

		public static bool SkipHtmlEntity(string str, ref int pos, ref string entity)
		{
			if (str[pos] != '&')
				return false;

			int savepos = pos;
			int len = str.Length;
			int i = pos+1;

			// Number entity?
			bool bNumber=false;
			bool bHex = false;
			if (i < len && str[i] == '#')
			{
				bNumber = true;
				i++;

				// Hex identity?
				if (i < len && (str[i] == 'x' || str[i] == 'X'))
				{
					bHex = true;
					i++;
				}
			}


			// Parse the content
			int contentpos = i;
			while (i < len)
			{
				char ch=str[i];

				if (bHex)
				{
					if (!(char.IsDigit(ch) || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F')))
						break;
				}

				else if (bNumber)
				{
					if (!char.IsDigit(ch))
						break;
				}
				else if (!char.IsLetterOrDigit(ch))
					break;

				i++;
			}

			// Quit if ran out of string
			if (i == len)
				return false;

			// Quit if nothing in the content
			if (i == contentpos)
				return false;

			// Quit if didn't find a semicolon
			if (str[i] != ';')
				return false;

			// Looks good...
			pos = i + 1;

			entity = str.Substring(savepos, pos - savepos);
			return true;
		}

		// Like HtmlEncode, but don't escape &'s that look like html entities
		public static void SmartHtmlEncodeAmpsAndAngles(StringBuilder dest, string str)
		{
			for (int i=0; i<str.Length; i++)
			{
				switch (str[i])
				{
					case '&':
						int start = i;
						string unused=null;
						if (SkipHtmlEntity(str, ref i, ref unused))
						{
							dest.Append(str, start, i - start);
							i--;
						}
						else
						{
							dest.Append("&amp;");
						}
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
						dest.Append(str[i]);
						break;
				}
			}
		}
		// Like HtmlEncode, but don't escape &'s that look like html entities
		public static void SmartHtmlEncodeAmps(StringBuilder dest, string str)
		{
			for (int i = 0; i < str.Length; i++)
			{
				switch (str[i])
				{
					case '&':
						int start = i;
						string unused = null;
						if (SkipHtmlEntity(str, ref i, ref unused))
						{
							dest.Append(str, start, i - start);
							i--;
						}
						else
						{
							dest.Append("&amp;");
						}
						break;

					default:
						dest.Append(str[i]);
						break;
				}
			}
		}

		public static bool IsInList(string str, string[] list)
		{
			foreach (var t in list)
			{
				if (string.Compare(t, str) == 0)
					return true;
			}
			return false;
		}

		public static bool IsSafeUrl(string url)
		{
			if (!url.StartsWith("http://") && !url.StartsWith("https://") && !url.StartsWith("ftp://"))
				return false;

			return true;
		}

	}
}
