using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	public class StringParser
	{
		// Constructor
		public StringParser()
		{
		}

		// Constructor
		public StringParser(string str)
		{
			Reset(str);
		}

		// Constructor
		public StringParser(string str, int pos)
		{
			Reset(str, pos);
		}

		// Constructor
		public StringParser(string str, int pos, int len)
		{
			Reset(str, pos, len);
		}

		// Reset
		public void Reset(string str)
		{
			Reset(str, 0, str!=null ? str.Length : 0);
		}

		// Reset
		public void Reset(string str, int pos)
		{
			Reset(str, pos, str!=null ? str.Length - pos : 0);
		}

		// Reset
		public void Reset(string str, int pos, int len)
		{
			if (str == null)
				str = "";
			if (len < 0)
				len = 0;
			if (pos < 0)
				pos = 0;
			if (pos > str.Length)
				pos = str.Length;

			this.str = str;
			this.start = pos;
			this.pos = pos;
			this.end = pos + len;
		}

		public string input
		{
			get
			{
				return str;
			}
		}

		// Get the current character
		public char current
		{
			get
			{
				return CharAtOffset(0);
			}
		}

		// Get/set the current position
		public int position
		{
			get
			{
				return pos;
			}
			set
			{
				pos = value;
			}
		}

		public int end_position
		{
			get
			{
				return end;
			}
		}

		public string remainder
		{
			get
			{
				return Substring(position);
			}
		}


		public void SkipToEnd()
		{
			pos = end;
		}

		// Get the character at offset from current position
		// Or, \0 if out of range
		public char CharAtOffset(int offset)
		{
			int index = pos + offset;
			if (index < 0)
				return '\0';
			if (index >= end)
				return '\0';
			return str[index];
		}

		// Skip a number of characters
		public void Skip(int characters)
		{
			pos += characters;
		}

		// Skip a character if present
		public bool Skip(char ch)
		{
			if (current == ch)
			{
				Skip(1);
				return true;
			}

			return false;	
		}

		// Skip a matching string
		public bool Skip(string str)
		{
			if (DoesMatch(str))
			{
				Skip(str.Length);
				return true;
			}

			return false;
		}

		// Skip any whitespace
		public bool SkipWhitespace()
		{
			if (!char.IsWhiteSpace(current))
				return false;
			Skip(1);

			while (char.IsWhiteSpace(current))
				Skip(1);

			return true;
		}

		// Check if a character is space or tab
		public static bool IsLineSpace(char ch)
		{
			return ch == ' ' || ch == '\t';
		}

		// Skip spaces and tabs
		public bool SkipLinespace()
		{
			if (!IsLineSpace(current))
				return false;
			Skip(1);

			while (IsLineSpace(current))
				Skip(1);

			return true;
		}

		// Does current character match something
		public bool DoesMatch(char ch)
		{
			return current == ch;
		}

		// Does character at offset match a character
		public bool DoesMatch(int offset, char ch)
		{
			return CharAtOffset(offset) == ch;
		}

		// Does current character match any of a range of characters
		public bool DoesMatchAny(char[] chars)
		{
			for (int i = 0; i < chars.Length; i++)
			{
				if (DoesMatch(chars[i]))
					return true;
			}
			return false;
		}

		// Does current character match any of a range of characters
		public bool DoesMatchAny(int offset, char[] chars)
		{
			for (int i = 0; i < chars.Length; i++)
			{
				if (DoesMatch(offset, chars[i]))
					return true;
			}
			return false;
		}

		// Does current string position match a string
		public bool DoesMatch(string str)
		{
			for (int i = 0; i < str.Length; i++)
			{
				if (str[i] != CharAtOffset(i))
					return false;
			}

			return true;
		}

		// Extract a substring
		public string Substring(int start)
		{
			return str.Substring(start, end-start);
		}

		// Extract a substring
		public string Substring(int start, int len)
		{
			if (start + len > end)
				len = end - start;

			return str.Substring(start, len);
		}

		// Scan forward for a character
		public bool Find(char ch)
		{
			if (pos >= end)
				return false;

			// Find it
			int index = str.IndexOf(ch, pos);
			if (index < 0 || index>=end)
				return false;

			// Store new position
			pos = index;
			return true;
		}

		// Find any of a range of characters
		public bool FindAny(char[] chars)
		{
			if (pos >= end)
				return false;

			// Find it
			int index = str.IndexOfAny(chars, pos);
			if (index < 0 || index>=end)
				return false;

			// Store new position
			pos = index;
			return true;
		}

		// Forward scan for a string
		public bool Find(string find)
		{
			if (pos >= end)
				return false;

			int index = str.IndexOf(find, pos);
			if (index < 0 || index > end-find.Length)
				return false;

			pos = index;
			return true;
		}

		// Forward scan for a string (case insensitive)
		public bool FindI(string find)
		{
			if (pos >= end)
				return false;

			int index = str.IndexOf(find, pos, StringComparison.InvariantCultureIgnoreCase);
			if (index < 0 || index >= end - find.Length)
				return false;

			pos = index;
			return true;
		}

		// Are we at eof?
		public bool eof
		{
			get
			{
				return pos >= end;
			}
		}

		// Are we at bof?
		public bool bof
		{
			get
			{
				return pos == start;
			}
		}

		// Mark current position
		public void Mark()
		{
			mark = pos;
		}

		// Extract string from mark to current position
		public string Extract()
		{
			if (mark >= pos)
				return "";

			return str.Substring(mark, pos - mark);
		}

		// Skip an identifier
		public bool SkipIdentifier(ref string identifier)
		{
			int savepos = position;
			if (!Utils.ParseIdentifier(this.str, ref pos, ref identifier))
				return false;
			if (pos >= end)
			{
				pos = savepos;
				return false;
			}
			return true;
		}

		public bool SkipHtmlEntity(ref string entity)
		{
			int savepos = position;
			if (!Utils.SkipHtmlEntity(this.str, ref pos, ref entity))
				return false;
			if (pos >= end)
			{
				pos = savepos;
				return false;
			}
			return true;
		}


		// Attributes
		string str;
		int start;
		int pos;
		int end;
		int mark;
	}
}
