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
			Assert.AreEqual(BlockType.p, b[0].blockType);
			Assert.AreEqual("paragraph", b[0].Content);
		}

		[Test]
		public void MultilineParagraph()
		{
			var b = p.Process("l1\nl2\n\n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(BlockType.p, b[0].blockType);
			Assert.AreEqual("l1\nl2", b[0].Content);
		}

		[Test]
		public void SetExtH1()
		{
			var b = p.Process("heading\n===\n\n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(BlockType.h1, b[0].blockType);
			Assert.AreEqual("heading", b[0].Content);
		}

		[Test]
		public void SetExtH2()
		{
			var b = p.Process("heading\n---\n\n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(BlockType.h2, b[0].blockType);
			Assert.AreEqual("heading", b[0].Content);
		}

		[Test]
		public void SetExtHeadingInParagraph()
		{
			var b = p.Process("p1\nheading\n---\np2\n");
			Assert.AreEqual(3, b.Count);

			Assert.AreEqual(BlockType.p, b[0].blockType);
			Assert.AreEqual("p1", b[0].Content);

			Assert.AreEqual(BlockType.h2, b[1].blockType);
			Assert.AreEqual("heading", b[1].Content);

			Assert.AreEqual(BlockType.p, b[2].blockType);
			Assert.AreEqual("p2", b[2].Content);
		}

		[Test]
		public void AtxHeaders()
		{
			var b = p.Process("#heading#\nparagraph\n");
			Assert.AreEqual(2, b.Count);

			Assert.AreEqual(BlockType.h1, b[0].blockType);
			Assert.AreEqual("heading", b[0].Content);

			Assert.AreEqual(BlockType.p, b[1].blockType);
			Assert.AreEqual("paragraph", b[1].Content);
		}

		[Test]
		public void AtxHeadingInParagraph()
		{
			var b = p.Process("p1\n## heading ##\np2\n");

			Assert.AreEqual(3, b.Count);

			Assert.AreEqual(BlockType.p, b[0].blockType);
			Assert.AreEqual("p1", b[0].Content);

			Assert.AreEqual(BlockType.h2, b[1].blockType);
			Assert.AreEqual("heading", b[1].Content);

			Assert.AreEqual(BlockType.p, b[2].blockType);
			Assert.AreEqual("p2", b[2].Content);
		}

		[Test]
		public void CodeBlock()
		{
			var b = p.Process("\tcode1\n\t\tcode2\n\tcode3\nparagraph");
			Assert.AreEqual(2, b.Count);

			Block cb = b[0] as Block;
			Assert.AreEqual("code1\n\tcode2\ncode3\n", cb.Content);

			Assert.AreEqual(BlockType.p, b[1].blockType);
			Assert.AreEqual("paragraph", b[1].Content);
		}

		[Test]
		public void HtmlBlock()
		{
			var b = p.Process("<div>\n</div>\n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(BlockType.html, b[0].blockType);
			Assert.AreEqual("<div>\n</div>\n", b[0].Content);
		}

		[Test]
		public void HtmlCommentBlock()
		{
			var b = p.Process("<!-- this is a\ncomments -->\n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(BlockType.html, b[0].blockType);
			Assert.AreEqual("<!-- this is a\ncomments -->\n", b[0].Content);
		}

		[Test]
		public void HorizontalRules()
		{
			var b = p.Process("---\n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(BlockType.hr, b[0].blockType);

			b = p.Process("___\n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(BlockType.hr, b[0].blockType);

			b = p.Process("***\n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(BlockType.hr, b[0].blockType);

			b = p.Process(" - - - \n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(BlockType.hr, b[0].blockType);

			b = p.Process("  _ _ _ \n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(BlockType.hr, b[0].blockType);

			b = p.Process(" * * * \n");
			Assert.AreEqual(1, b.Count);
			Assert.AreEqual(BlockType.hr, b[0].blockType);
		}


		BlockProcessor p;
	}
}
