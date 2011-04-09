using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using MarkdownDeep;
using NUnit.Framework;

namespace MarkdownDeepTests
{
	[TestFixture]
	class LinkAndImgTests
	{
		[SetUp]
		public void SetUp()
		{
			m = new Markdown();
			m.AddLinkDefinition(new LinkDefinition("link1", "url.com", "title"));
			m.AddLinkDefinition(new LinkDefinition("link2", "url.com"));
			m.AddLinkDefinition(new LinkDefinition("img1", "url.com/image.png", "title"));
			m.AddLinkDefinition(new LinkDefinition("img2", "url.com/image.png"));

			s = new SpanFormatter(m);
		}

		[Test]
		public void ReferenceLinkWithTitle()
		{
			Assert.AreEqual("pre <a href=\"url.com\" title=\"title\">link text</a> post",
					s.Format("pre [link text][link1] post"));
		}

		[Test]
		public void ReferenceLinkIdsAreCaseInsensitive()
		{
			Assert.AreEqual("pre <a href=\"url.com\" title=\"title\">link text</a> post",
					s.Format("pre [link text][LINK1] post"));
		}

		[Test]
		public void ImplicitReferenceLinkWithoutTitle()
		{
			Assert.AreEqual("pre <a href=\"url.com\">link2</a> post",
					s.Format("pre [link2] post"));
			Assert.AreEqual("pre <a href=\"url.com\">link2</a> post",
					s.Format("pre [link2][] post"));
		}

		[Test]
		public void ImplicitReferenceLinkWithTitle()
		{
			Assert.AreEqual("pre <a href=\"url.com\" title=\"title\">link1</a> post",
					s.Format("pre [link1] post"));
			Assert.AreEqual("pre <a href=\"url.com\" title=\"title\">link1</a> post",
					s.Format("pre [link1][] post"));
		}

		[Test]
		public void ReferenceLinkWithoutTitle()
		{
			Assert.AreEqual("pre <a href=\"url.com\">link text</a> post",
					s.Format("pre [link text][link2] post"));
		}

		[Test]
		public void MissingReferenceLink()
		{
			Assert.AreEqual("pre [link text][missing] post",
					s.Format("pre [link text][missing] post"));
		}

		[Test]
		public void InlineLinkWithTitle()
		{
			Assert.AreEqual("pre <a href=\"url.com\" title=\"title\">link text</a> post",
					s.Format("pre [link text](url.com \"title\") post"));
		}

		[Test]
		public void InlineLinkWithoutTitle()
		{
			Assert.AreEqual("pre <a href=\"url.com\">link text</a> post",
					s.Format("pre [link text](url.com) post"));
		}

		[Test]
		public void Boundaries()
		{
			Assert.AreEqual("<a href=\"url.com\">link text</a>",
					s.Format("[link text](url.com)"));
			Assert.AreEqual("<a href=\"url.com\" title=\"title\">link text</a>",
					s.Format("[link text][link1]"));
		}


		[Test]
		public void ReferenceImgWithTitle()
		{
			Assert.AreEqual("pre <img src=\"url.com/image.png\" alt=\"alt text\" title=\"title\" /> post",
					s.Format("pre ![alt text][img1] post"));
		}

		[Test]
		public void ImplicitReferenceImgWithoutTitle()
		{
			Assert.AreEqual("pre <img src=\"url.com/image.png\" alt=\"img2\" /> post",
					s.Format("pre ![img2] post"));
			Assert.AreEqual("pre <img src=\"url.com/image.png\" alt=\"img2\" /> post",
					s.Format("pre ![img2][] post"));
		}

		[Test]
		public void ImplicitReferenceImgWithTitle()
		{
			Assert.AreEqual("pre <img src=\"url.com/image.png\" alt=\"img1\" title=\"title\" /> post",
					s.Format("pre ![img1] post"));
			Assert.AreEqual("pre <img src=\"url.com/image.png\" alt=\"img1\" title=\"title\" /> post",
					s.Format("pre ![img1][] post"));
		}

		[Test]
		public void ReferenceImgWithoutTitle()
		{
			Assert.AreEqual("pre <img src=\"url.com/image.png\" alt=\"alt text\" /> post",
					s.Format("pre ![alt text][img2] post"));
		}

		[Test]
		public void MissingReferenceImg()
		{
			Assert.AreEqual("pre ![alt text][missing] post",
					s.Format("pre ![alt text][missing] post"));
		}

		[Test]
		public void InlineImgWithTitle()
		{
			Assert.AreEqual("pre <img src=\"url.com/image.png\" alt=\"alt text\" title=\"title\" /> post",
					s.Format("pre ![alt text](url.com/image.png \"title\") post"));
		}

		[Test]
		public void InlineImgWithoutTitle()
		{
			Assert.AreEqual("pre <img src=\"url.com/image.png\" alt=\"alt text\" /> post",
					s.Format("pre ![alt text](url.com/image.png) post"));
		}

        [Test]
        public void ImageLink() {
            Assert.AreEqual("pre <a href=\"url.com\"><img src=\"url.com/image.png\" alt=\"alt text\" /></a> post",
                    s.Format("pre [![alt text](url.com/image.png)](url.com) post"));
        }



		Markdown m;
		SpanFormatter s;
	}
}
