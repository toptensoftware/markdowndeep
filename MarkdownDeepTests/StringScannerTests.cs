using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using MarkdownDeep;

namespace MarkdownDeepTests
{
	[TestFixture]
	class StringScannerTests
	{
		[Test]
		public void Tests()
		{
			var p = new StringScanner();

			p.Reset("This is a string with something [bracketed]");
			Assert.IsTrue(p.bof);
			Assert.IsFalse(p.eof);
			Assert.IsTrue(p.SkipString("This"));
			Assert.IsFalse(p.bof);
			Assert.IsFalse(p.eof);
			Assert.IsFalse(p.SkipString("huh?"));
			Assert.IsTrue(p.SkipLinespace());
			Assert.IsTrue(p.SkipChar('i'));
			Assert.IsTrue(p.SkipChar('s'));
			Assert.IsTrue(p.SkipWhitespace());
			Assert.IsTrue(p.DoesMatchAny(new char[] { 'r', 'a', 't'} ));
			Assert.IsFalse(p.Find("Not here"));
			Assert.IsFalse(p.Find("WITH"));
			Assert.IsFalse(p.FindI("Not here"));
			Assert.IsTrue(p.FindI("WITH"));
			Assert.IsTrue(p.Find('['));
			p.SkipForward(1);
			p.Mark();
			Assert.IsTrue(p.Find(']'));
			Assert.AreEqual("bracketed", p.Extract());
			Assert.IsTrue(p.SkipChar(']'));
			Assert.IsTrue(p.eof);
		}
	}
}
