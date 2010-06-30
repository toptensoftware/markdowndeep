using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	class ListBlock : ParentBlock
	{
		public ListBlock(LineType lt) : base(lt, null)
		{
		}

		internal override void Render(Markdown m, StringBuilder b)
		{
			b.AppendFormat("<{0}>\n", m_LineType.ToString());			
			base.Render(m, b);
			b.AppendFormat("</{0}>\n", m_LineType.ToString());
		}
	}
}
