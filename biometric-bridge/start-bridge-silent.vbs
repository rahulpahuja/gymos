' Launches the bridge with no visible console window. Used by the Startup
' shortcut install.bat creates, so it runs silently in the background on
' every login. Double-clicking this file directly does the same thing.
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = scriptDir
shell.Run "python server.py", 0, False
