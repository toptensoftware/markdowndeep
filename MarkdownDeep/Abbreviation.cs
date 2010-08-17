using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	class Abbreviation
	{
		public Abbreviation(string abbr, string title)
		{
			Abbr = abbr;
			Title = title;
		}
		public string Abbr;
		public string Title;
	}
}
