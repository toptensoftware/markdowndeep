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
	/*
	 * Token is used to mark out various special parts of a string being
	 * formatted by SpanFormatter.
	 * 
	 * Strings aren't actually stored in the token - just their offset
	 * and length in the input string.
	 * 
	 * For performance, Token's are pooled and reused.  
	 * See SpanFormatter.CreateToken()
	 */

	// TokenType - what sort of token?
	internal enum TokenType
	{
		Text,			// Plain text, should be htmlencoded
		HtmlTag,		// Valid html tag, write out directly but escape &amps;
		Html,			// Valid html, write out directly
		open_em,		// <em>
		close_em,		// </em>
		open_strong,	// <strong>
		close_strong,	// </strong>
		code_span,		// <code></code>
		br,				// <br />

		link,			// <a href>, data = LinkInfo
		img,			// <img>, data = LinkInfo
		footnote,		// Footnote reference
		abbreviation,	// An abbreviation, data is a reference to Abbrevation instance

		// These are used during construction of <em> and <strong> tokens
		opening_mark,	// opening '*' or '_'
		closing_mark,	// closing '*' or '_'
		internal_mark,	// internal '*' or '_'
	}

	// Token
	internal class Token
	{
		// Constructor
		public Token(TokenType type, int startOffset, int length)
		{
			this.type = type;
			this.startOffset = startOffset;
			this.length = length;
		}

		// Constructor
		public Token(TokenType type, object data)
		{
			this.type = type;
			this.data = data;
		}

		public override string ToString()
		{
			if (true || data == null)
			{
				return string.Format("{0} - {1} - {2}", type.ToString(), startOffset, length);
			}
			else
			{
				return string.Format("{0} - {1} - {2} -> {3}", type.ToString(), startOffset, length, data.ToString());
			}
		}

		public TokenType type;
		public int startOffset;
		public int length;
		public object data;
	}

}
