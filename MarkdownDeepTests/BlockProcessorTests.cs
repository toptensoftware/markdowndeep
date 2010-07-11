using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using MarkdownDeep;

namespace MarkdownDeepTests
{
	[TestFixture]
	class BlockProcessorTests
	{
		[SetUp]
		public void Setup()
		{
			p = new BlockProcessor(new Markdown());
		}

		[Test]
		public void SingleLineParagraph()
		{
			var b = p.Process("paragraph");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(LineType.p, b[0].lineType);
			Assert.AreEqual("paragraph", b[0].Content);
		}

		[Test]
		public void MultilineParagraph()
		{
			var b = p.Process("l1\nl2\n\n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(LineType.p, b[0].lineType);
			Assert.AreEqual("l1\nl2", b[0].Content);
		}

		[Test]
		public void SetExtH1()
		{
			var b = p.Process("heading\n===\n\n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(LineType.h1, b[0].lineType);
			Assert.AreEqual("heading", b[0].Content);
		}

		[Test]
		public void SetExtH2()
		{
			var b = p.Process("heading\n---\n\n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(LineType.h2, b[0].lineType);
			Assert.AreEqual("heading", b[0].Content);
		}

		[Test]
		public void SetExtHeadingInParagraph()
		{
			var b = p.Process("p1\nheading\n---\np2\n");
			Assert.AreEqual(3, b.Count);

			Assert.AreEqual(LineType.p, b[0].lineType);
			Assert.AreEqual("p1", b[0].Content);

			Assert.AreEqual(LineType.h2, b[1].lineType);
			Assert.AreEqual("heading", b[1].Content);

			Assert.AreEqual(LineType.p, b[2].lineType);
			Assert.AreEqual("p2", b[2].Content);
		}

		[Test]
		public void AtxHeaders()
		{
			var b = p.Process("#heading#\nparagraph\n");
			Assert.AreEqual(2, b.Count);

			Assert.AreEqual(LineType.h1, b[0].lineType);
			Assert.AreEqual("heading", b[0].Content);

			Assert.AreEqual(LineType.p, b[1].lineType);
			Assert.AreEqual("paragraph", b[1].Content);
		}

		[Test]
		public void AtxHeadingInParagraph()
		{
			var b = p.Process("p1\n## heading ##\np2\n");

			Assert.AreEqual(3, b.Count);

			Assert.AreEqual(LineType.p, b[0].lineType);
			Assert.AreEqual("p1", b[0].Content);

			Assert.AreEqual(LineType.h2, b[1].lineType);
			Assert.AreEqual("heading", b[1].Content);

			Assert.AreEqual(LineType.p, b[2].lineType);
			Assert.AreEqual("p2", b[2].Content);
		}

		[Test]
		public void CodeBlock()
		{
			var b = p.Process("\tcode1\n\t\tcode2\n\tcode3\nparagraph");
			Assert.AreEqual(2, b.Count);

			CodeBlock cb = b[0] as CodeBlock;
			Assert.AreEqual("code1\n\tcode2\ncode3\n", cb.Content);

			Assert.AreEqual(LineType.p, b[1].lineType);
			Assert.AreEqual("paragraph", b[1].Content);
		}

		[Test]
		public void HtmlBlock()
		{
			var b = p.Process("<div>\n</div>\n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(LineType.html, b[0].lineType);
			Assert.AreEqual("<div>\n</div>\n", b[0].Content);
		}

		[Test]
		public void HtmlCommentBlock()
		{
			var b = p.Process("<!-- this is a\ncomments -->\n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(LineType.html, b[0].lineType);
			Assert.AreEqual("<!-- this is a\ncomments -->\n", b[0].Content);
		}

		[Test]
		public void HorizontalRules()
		{
			var b = p.Process("---\n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(LineType.hr, b[0].lineType);

			b = p.Process("___\n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(LineType.hr, b[0].lineType);

			b = p.Process("***\n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(LineType.hr, b[0].lineType);

			b = p.Process(" - - - \n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(LineType.hr, b[0].lineType);

			b = p.Process("  _ _ _ \n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(LineType.hr, b[0].lineType);

			b = p.Process(" * * * \n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(LineType.hr, b[0].lineType);
		}


		BlockProcessor p;
	}
}
