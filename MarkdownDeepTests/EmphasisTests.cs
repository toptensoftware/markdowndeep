using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NUnit.Framework;
using MarkdownDeep;

namespace MarkdownDeepTests
{
	[TestFixture]
	public class EmphasisTests
	{
		[SetUp]
		public void SetUp()
		{
			f = new SpanFormatter(new Markdown());
		}

		SpanFormatter f;

		[Test]
		public void PlainText()
		{
			Assert.AreEqual("This is plain text",
					f.Format("This is plain text"));
		}


		[Test]
		public void em_simple()
		{
			Assert.AreEqual("This is <em>em</em> text",
					f.Format("This is *em* text"));
			Assert.AreEqual("This is <em>em</em> text",
					f.Format("This is _em_ text"));
		}

		[Test]
		public void strong_simple()
		{
			Assert.AreEqual("This is <strong>strong</strong> text",
					f.Format("This is **strong** text"));
			Assert.AreEqual("This is <strong>strong</strong> text",
					f.Format("This is __strong__ text"));
		}

		[Test]
		public void em_strong_lead_tail()
		{
			Assert.AreEqual("<strong>strong</strong>",
					f.Format("__strong__"));
			Assert.AreEqual("<strong>strong</strong>",
					f.Format("**strong**"));
			Assert.AreEqual("<em>em</em>",
					f.Format("_em_"));
			Assert.AreEqual("<em>em</em>",
					f.Format("*em*"));
		}


		[Test]
		public void strongem()
		{
			Assert.AreEqual("<strong><em>strongem</em></strong>",
					f.Format("***strongem***"));
			Assert.AreEqual("<strong><em>strongem</em></strong>",
					f.Format("___strongem___"));
		}

		[Test]
		public void no_strongem_if_spaces()
		{
			Assert.AreEqual("pre * notem *",
					f.Format("pre * notem *"));
			Assert.AreEqual("pre ** notstrong **",
					f.Format("pre ** notstrong **"));
			Assert.AreEqual("pre *Apples *Bananas *Oranges",
					f.Format("pre *Apples *Bananas *Oranges"));
		}

		[Test]
		public void em_in_word()
		{
			Assert.AreEqual("un<em>frigging</em>believable",
					f.Format("un*frigging*believable"));
		}

		[Test]
		public void strong_in_word()
		{
			Assert.AreEqual("un<strong>frigging</strong>believable",
					f.Format("un**frigging**believable"));
		}		   

	}
}
