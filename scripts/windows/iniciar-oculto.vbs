' Inicia iniciar-sistema.cmd sin mostrar una ventana de consola (lo usa la tarea programada).
Set shell = CreateObject("WScript.Shell")
carpeta = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
shell.Run """" & carpeta & "\iniciar-sistema.cmd""", 0, False
