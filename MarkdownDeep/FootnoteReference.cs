// 
//   MarkdownDeep - http://www.toptensoftware.com/markdowndeep
// 
//   The contents of this file are subject to the license terms as 
//	 specified at the web address above.
//  
//   Software distributed under the License is distributed on an 
//   "AS IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or
//   implied. See the License for the specific language governing
//   rights and limitations under the License.
// 
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
