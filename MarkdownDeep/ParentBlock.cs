using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	class ParentBlock  : Block
	{
		public ParentBlock(LineType lt)
			: base(lt)
		{
		}

		internal override void Render(Markdown m, StringBuilder b)
		{
			foreach (var block in m_childBlocks)
			{
				block.Render(m, b);
			}
		}

		internal List<Block> m_childBlocks=new List<Block>();
	}
}
