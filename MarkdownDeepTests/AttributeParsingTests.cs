using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using MarkdownDeep;

namespace MarkdownDeepTests
{
	[TestFixture]
	class HtmlTagTests
	{
		[SetUp]
		public void SetUp()
		{
			m_pos = 0;
		}

		[Test]
		public void Unquoted()
		{
			string str = @"<div x=1 y=2>";
			HtmlTag tag = HtmlTag.Parse(str, ref m_pos);

			Assert.AreEqual(tag.name, "div");
			Assert.AreEqual(tag.closing, false);
			Assert.AreEqual(tag.closed, false);
			Assert.AreEqual(tag.attributes.Count, 2);
			Assert.AreEqual(tag.attributes["x"], "1");
			Assert.AreEqual(tag.attributes["y"], "2");
			Assert.AreEqual(m_pos, str.Length);

		}

		[Test]
		public void Quoted()
		{
			string str = @"<div x=""1"" y=""2"">";
			HtmlTag tag = HtmlTag.Parse(str, ref m_pos);

			Assert.AreEqual(tag.name, "div");
			Assert.AreEqual(tag.closing, false);
			Assert.AreEqual(tag.closed, false);
			Assert.AreEqual(tag.attributes.Count, 2);
			Assert.AreEqual(tag.attributes["x"], "1");
			Assert.AreEqual(tag.attributes["y"], "2");
			Assert.AreEqual(m_pos, str.Length);

		}

		[Test]
		public void Empty()
		{
			string str = @"<div>";
			HtmlTag tag = HtmlTag.Parse(str, ref m_pos);

			Assert.AreEqual(tag.name, "div");
			Assert.AreEqual(tag.closing, false);
			Assert.AreEqual(tag.closed, false);
			Assert.AreEqual(tag.attributes.Count, 0);
			Assert.AreEqual(m_pos, str.Length);

		}

		[Test]
		public void Closed()
		{
			string str = @"<div/>";
			HtmlTag tag = HtmlTag.Parse(str, ref m_pos);

			Assert.AreEqual(tag.name, "div");
			Assert.AreEqual(tag.closing, false);
			Assert.AreEqual(tag.closed, true);
			Assert.AreEqual(tag.attributes.Count, 0);
			Assert.AreEqual(m_pos, str.Length);

		}

		[Test]
		public void ClosedWithAttribs()
		{
			string str = @"<div x=1 y=2/>";
			HtmlTag tag = HtmlTag.Parse(str, ref m_pos);

			Assert.AreEqual(tag.name, "div");
			Assert.AreEqual(tag.closing, false);
			Assert.AreEqual(tag.closed, true);
			Assert.AreEqual(tag.attributes.Count, 2);
			Assert.AreEqual(tag.attributes["x"], "1");
			Assert.AreEqual(tag.attributes["y"], "2");
			Assert.AreEqual(m_pos, str.Length);

		}

		[Test]
		public void Closing()
		{
			string str = @"</div>";
			HtmlTag tag = HtmlTag.Parse(str, ref m_pos);

			Assert.AreEqual(tag.name, "div");
			Assert.AreEqual(tag.closing, true);
			Assert.AreEqual(tag.closed, false);
			Assert.AreEqual(tag.attributes.Count, 0);
			Assert.AreEqual(m_pos, str.Length);

		}

		int m_pos;

	}
}
