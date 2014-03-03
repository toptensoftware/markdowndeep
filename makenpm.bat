cd NodePackage
copy ..\MarkdownDeepJS\MarkdownDeep.js 
copy ..\MarkdownDeepJS\MarkdownDeep*.js .\clientSide\
copy ..\MarkdownDeepJS\mdd_*.* .\clientSide\
call npm version patch -m "Version %s"
call npm publish
cd ..
