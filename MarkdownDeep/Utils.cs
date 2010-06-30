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



	}
}
