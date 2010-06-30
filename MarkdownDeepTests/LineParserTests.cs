using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using MarkdownDeep;

namespace MarkdownDeepTests
{
	[TestFixture]
	public class LineParserTests
	{
		[SetUp]
		public void Init()
		{
			md=new Markdown();
			lp = new LineParser(md);
		}

		[Test]
		public void NullLines()
		{
			Block b=lp.ProcessLine(null);
			Assert.AreEqual(b.m_LineType, LineType.Blank);
		}

		[Test]
		public void EmptyLines()
		{
			Block b = lp.ProcessLine("");
			Assert.AreEqual(b.m_LineType, LineType.Blank);
		}

		[Test]
		public void SpaceLines()
		{
			Block b = lp.ProcessLine("   ");
			Assert.AreEqual(b.m_LineType, LineType.Blank);
		}

		[Test]
		public void TabsAndSpacesLines()
		{
			Block b = lp.ProcessLine("        \t      \t     \t");
			Assert.AreEqual(b.m_LineType, LineType.Blank);
		}

		[Test]
		public void paragraph()
		{
			Block b = lp.ProcessLine("This is a simple paragraph");
			Assert.AreEqual(b.m_LineType, LineType.plain);
			Assert.AreEqual(b.m_str, "This is a simple paragraph");
		}

		[Test]
		public void almost_indented_paragraph()
		{
			Block b = lp.ProcessLine("   This is a simple paragraph");
			Assert.AreEqual(b.m_LineType, LineType.plain);
			Assert.AreEqual(b.m_str, "   This is a simple paragraph");
		}

		[Test]
		public void SetExt_h1()
		{
			Block b = lp.ProcessLine("===");
			Assert.AreEqual(b.m_LineType, LineType.post_h1);
		}

		[Test]
		public void SetExt_h2()
		{
			Block b = lp.ProcessLine("---");
			Assert.AreEqual(b.m_LineType, LineType.post_h2);
		}

		[Test]
		public void h1()
		{
			Block b = lp.ProcessLine("# Heading 1");
			Assert.AreEqual(b.m_LineType, LineType.h1);
			Assert.AreEqual(b.m_str, "Heading 1");
		}

		[Test]
		public void h2()
		{
			Block b = lp.ProcessLine("## Heading 2");
			Assert.AreEqual(b.m_LineType, LineType.h2);
			Assert.AreEqual(b.m_str, "Heading 2");
		}

		[Test]
		public void h6()
		{
			Block b = lp.ProcessLine("###### Heading 6");
			Assert.AreEqual(b.m_LineType, LineType.h6);
			Assert.AreEqual(b.m_str, "Heading 6");
		}

		[Test]
		public void heading_with_suffix()
		{
			Block b = lp.ProcessLine("## Heading 2 ##");
			Assert.AreEqual(b.m_LineType, LineType.h2);
			Assert.AreEqual(b.m_str, "Heading 2");
		}

		[Test]
		public void heading_with_too_many_hashes()
		{
			Block b = lp.ProcessLine("######## Extreme ############");
			Assert.AreEqual(b.m_LineType, LineType.h6);
			Assert.AreEqual(b.m_str, "Extreme");
		}

		[Test]
		public void indented_with_spaces()
		{
			Block b = lp.ProcessLine("      code");
			Assert.AreEqual(b.m_LineType, LineType.indent);
			Assert.AreEqual(b.m_str, "  code");
		}

		[Test]
		public void indented_with_tab()
		{
			Block b = lp.ProcessLine("\t  code");
			Assert.AreEqual(b.m_LineType, LineType.indent);
			Assert.AreEqual(b.m_str, "  code");
		}

		[Test]
		public void indented_with_spaces_and_tab()
		{
			Block b = lp.ProcessLine("  \t  code");
			Assert.AreEqual(b.m_LineType, LineType.indent);
			Assert.AreEqual(b.m_str, "  code");
		}

		[Test]
		public void block_quote_basic()
		{
			Block b = lp.ProcessLine("> quote");
			Assert.AreEqual(b.m_LineType, LineType.quote);
			Assert.AreEqual(b.m_str, "quote");
		}

		[Test]
		public void block_quote_with_spaces_before()
		{
			Block b = lp.ProcessLine("  > quote");
			Assert.AreEqual(b.m_LineType, LineType.quote);
			Assert.AreEqual(b.m_str, "quote");
		}

		[Test]
		public void block_quote_with_spaces_after()
		{
			Block b = lp.ProcessLine(">  quote");
			Assert.AreEqual(b.m_LineType, LineType.quote);
			Assert.AreEqual(b.m_str, " quote");
		}

		/*
		 * This test doesn't apply as --- returns as a post_h1. We convert this to a hr later in processing if
		 * we can't apply the post_h1 to a preceeding paragraph
		[Test]
		public void hr()
		{
			Block b = lp.ProcessLine("---");
			Assert.AreEqual(b.m_LineType, LineType.hr);
		}
		 */

		[Test]
		public void hr_1()
		{
			Block b = lp.ProcessLine("___");
			Assert.AreEqual(b.m_LineType, LineType.hr);
		}

		[Test]
		public void hr_2()
		{
			Block b = lp.ProcessLine("***");
			Assert.AreEqual(b.m_LineType, LineType.hr);
		}

		[Test]
		public void hr_3()
		{
			Block b = lp.ProcessLine("  - - -  ");
			Assert.AreEqual(b.m_LineType, LineType.hr);
		}

		[Test]
		public void hr_4()
		{
			Block b = lp.ProcessLine("  _ _ _  ");
			Assert.AreEqual(b.m_LineType, LineType.hr);
		}

		[Test]
		public void hr_5()
		{
			Block b = lp.ProcessLine("  * * *  ");
			Assert.AreEqual(b.m_LineType, LineType.hr);
		}

		[Test]
		public void ul_star()
		{
			Block b = lp.ProcessLine("* Item 1");
			Assert.AreEqual(b.m_LineType, LineType.ul);
			Assert.AreEqual(b.m_str, "Item 1");
			Assert.AreEqual(b.m_strOriginal, "* Item 1");
		}

		[Test]
		public void ul_hyphen()
		{
			Block b = lp.ProcessLine("- Item 1");
			Assert.AreEqual(b.m_LineType, LineType.ul);
			Assert.AreEqual(b.m_str, "Item 1");
			Assert.AreEqual(b.m_strOriginal, "- Item 1");
		}

		[Test]
		public void ul_plus()
		{
			Block b = lp.ProcessLine("+ Item 1");
			Assert.AreEqual(b.m_LineType, LineType.ul);
			Assert.AreEqual(b.m_str, "Item 1");
			Assert.AreEqual(b.m_strOriginal, "+ Item 1");
		}

		[Test]
		public void ul_without_space()
		{
			Block b = lp.ProcessLine("*Item 1");
			Assert.AreNotEqual(b.m_LineType, LineType.ul);
		}

		[Test]
		public void ol()
		{
			Block b = lp.ProcessLine("1. Item 1");
			Assert.AreEqual(b.m_LineType, LineType.ol);
			Assert.AreEqual(b.m_str, "Item 1");
			Assert.AreEqual(b.m_strOriginal, "1. Item 1");
		}

		[Test]
		public void ol_without_space()
		{
			Block b = lp.ProcessLine("1.Item 1");
			Assert.AreNotEqual(b.m_LineType, LineType.ol);
		}

		[Test]
		public void html_block_simple()
		{
			lp.ProcessLine("<div class=\"MyDiv\">");
			Block b = lp.ProcessLine("</div>");

			Assert.AreEqual(b.m_LineType, LineType.html);
			Assert.AreEqual(b.m_str, "<div class=\"MyDiv\">\n</div>\n");
		}

		[Test]
		public void html_block_nested()
		{
			lp.ProcessLine("<div class=\"MyDiv\">");
			lp.ProcessLine("<div>");
			lp.ProcessLine("</div>");
			Block b = lp.ProcessLine("</div>");

			Assert.AreEqual(b.m_LineType, LineType.html);
			Assert.AreEqual(b.m_str, "<div class=\"MyDiv\">\n<div>\n</div>\n</div>\n");
		}

		[Test]
		public void html_block_nested_closed()
		{
			lp.ProcessLine("<div class=\"MyDiv\">");
			lp.ProcessLine("<div/>");
			Block b = lp.ProcessLine("</div>");

			Assert.AreEqual(b.m_LineType, LineType.html);
			Assert.AreEqual(b.m_str, "<div class=\"MyDiv\">\n<div/>\n</div>\n");
		}

		[Test]
		public void html_block_nested_other()
		{
			lp.ProcessLine("<div class=\"MyDiv\">");
			lp.ProcessLine("<p>Some tag");
			Block b = lp.ProcessLine("</div>");

			Assert.AreEqual(b.m_LineType, LineType.html);
			Assert.AreEqual(b.m_str, "<div class=\"MyDiv\">\n<p>Some tag\n</div>\n");
		}

		Markdown md;
		LineParser lp;
		
	}
}
