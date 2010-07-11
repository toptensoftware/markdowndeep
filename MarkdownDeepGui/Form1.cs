using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace MarkdownDeepGui
{
	public partial class Form1 : Form
	{
		public Form1()
		{
			InitializeComponent();
			this.txtMarkdown.Text = "# Welcome to MarkdownDeep #\r\n\r\nType markdown text above, see formatted text below!";
			this.txtMarkdown.SelectionStart = this.txtMarkdown.Text.Length;
		}

		private void txtMarkdown_TextChanged(object sender, EventArgs e)
		{
			this.txtSource.Text = m_Markdown.Transform(txtMarkdown.Text).Replace("\n", "\r\n");
			this.webPreview.DocumentText = this.txtSource.Text;
		}



		MarkdownDeep.Markdown m_Markdown = new MarkdownDeep.Markdown();
	}
}
