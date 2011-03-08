using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using MarkdownDeep;

namespace MarkdownDeepTests
{
	[TestFixture]
	public class EscapeCharacterTests
	{
		[SetUp]
		public void SetUp()
		{
			f = new SpanFormatter(new Markdown());
		}

		SpanFormatter f;

		[Test]
		public void AllEscapeCharacters()
		{
			Assert.AreEqual(@"pre \ ` * _ { } [ ] ( ) # + - . ! post",
					f.Format(@"pre \\ \` \* \_ \{ \} \[ \] \( \) \# \+ \- \. \! post"));
		}

		[Test]
		public void SomeNonEscapableCharacters()
		{
			Assert.AreEqual( @"pre \q \% \? post", 
					f.Format(@"pre \q \% \? post"));
		}

		[Test]
		public void BackslashWithTwoDashes()
		{
			Assert.AreEqual(@"backslash with \-- two dashes",
					f.Format(@"backslash with \\-- two dashes"));
		}		   

		[Test]
		public void BackslashWithGT()
		{
			Assert.AreEqual(@"backslash with \&gt; greater",
					f.Format(@"backslash with \\> greater"));
		}		   

		[Test]
		public void EscapeNotALink()
		{
			Assert.AreEqual(@"\[test](not a link)",
					f.Format(@"\\\[test](not a link)"));
		}

		[Test]
		public void NoEmphasis()
		{
			Assert.AreEqual(@"\*no emphasis*",
					f.Format(@"\\\*no emphasis*"));
		}
	}
}