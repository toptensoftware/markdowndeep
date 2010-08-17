using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	class FootnoteReference
	{
		public FootnoteReference(int index, string id)
		{
			this.index = index;
			this.id = id;
		}
		public int index;
		public string id;
	}
}
