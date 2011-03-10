REM Change current directory to script (ie:project) directory
cd /d %~dp0

REM Setup path to include our local Tools folder
set path=%~dp0..\Tools;%path%

REM Minify all script files
mm -nologo -check-filetimes MarkdownDeep.js
mm -nologo -check-filetimes MarkdownDeepEditor.js
mm -nologo -check-filetimes MarkdownDeepEditorUI.js
mm -nologo -check-filetimes MarkdownDeepLib.js

REM In Release mode, build the final zip file and the nuget packages
if "%1"=="Release" (
	
	cd ..
	if exist temp rd /s /q temp
	if exist .\Output\MarkdownDeep.zip del .\Output\MarkdownDeep.zip
	mkdir .\temp

	mkdir .\temp\js
	copy MarkdownDeepJS\MarkdownDeep*.js .\temp\js\
	copy MarkdownDeepJS\mdd_* .\temp\js\
	copy "MarkdownDeepJS\readme.txt" .\temp\

	mkdir .\temp\bin
	copy MarkdownDeep\bin\release\MarkdownDeep.dll .\temp\bin\

	cd temp
	zip ..\Output\MarkdownDeep.zip -r *.*
	cd ..

	rd /s /q .\temp\

	cd MarkdownDeepJS

	NuGet.exe pack ".\MarkdownDeepJS.nuspec" -o "..\Output"
	NuGet.exe pack ".\MarkdownDeepSample.nuspec" -o "..\Output"


)
