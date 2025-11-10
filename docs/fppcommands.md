FPP Commands Listing
Command	Description	Arguments	Example POST
All Lights Off	Turn all lights off.		{
  "command": "All Lights Off",
  "args": []
}
Effect Start		Effect Name (name: 'effect',  type: 'string')
Start Channel (name: 'startChannel',  type: 'int')
Loop Effect (name: 'loop',  type: 'bool')
Background (name: 'bg',  type: 'bool')
If Not Running (name: 'ifNotRunning',  type: 'bool')
Model (name: 'Model',  type: 'string')	{
  "command": "Effect Start",
  "args": [
    "effect",
    "0",
    "true",
    "false",
    "false",
    "Model"
  ]
}
Effect Stop	Stop the specified effect.	Effect Name (name: 'effect',  type: 'datalist')	{
  "command": "Effect Stop",
  "args": [
    "Effect Name"
  ]
}
Effects Stop	Stop all running effects.		{
  "command": "Effects Stop",
  "args": []
}
Extend Schedule		Extend for Seconds (name: 'Seconds',  type: 'int')
For schedule events occurring in the next x Seconds (name: 'Limit',  type: 'int')	{
  "command": "Extend Schedule",
  "args": [
    "300",
    "0"
  ]
}
FSEQ Effect Start		FSEQ Name (name: 'effect',  type: 'string')
Loop Effect (name: 'loop',  type: 'bool')
Background (name: 'bg',  type: 'bool')	{
  "command": "FSEQ Effect Start",
  "args": [
    "effect",
    "true",
    "false"
  ]
}
FSEQ Effect Stop		FSEQ Name (name: 'effect',  type: 'string')	{
  "command": "FSEQ Effect Stop",
  "args": [
    "effect"
  ]
}
GPIO		Pin (name: 'pin',  type: 'string')
Action (name: 'on',  type: 'string')	{
  "command": "GPIO",
  "args": [
    "pin",
    "on"
  ]
}
Insert Playlist After Current	After the current item of the currently running playlist is complete, run the new playlist. When complete, resumes the original playlist at the next position.	Playlist Name (name: 'name',  type: 'string')
Start Item Index (name: 'startItem',  type: 'int')
End Item Index (name: 'endItem',  type: 'int')
If Not Running (name: 'ifNotRunning',  type: 'bool')	{
  "command": "Insert Playlist After Current",
  "args": [
    "name",
    "-1",
    "-1",
    "false"
  ]
}
Insert Playlist Immediate	If possible, pauses the currently running playlist and then runs the new playlist. When complete, resumes the original playlist where it was paused.	Playlist Name (name: 'name',  type: 'string')
Start Item Index (name: 'startItem',  type: 'int')
End Item Index (name: 'endItem',  type: 'int')
If Not Running (name: 'ifNotRunning',  type: 'bool')	{
  "command": "Insert Playlist Immediate",
  "args": [
    "name",
    "0",
    "0",
    "false"
  ]
}
Insert Random Item From Playlist	Run a random item from the given playlist. When complete, resumes the original playlist.	Playlist Name (name: 'name',  type: 'string')
Immediate (name: 'immediate',  type: 'bool')	{
  "command": "Insert Random Item From Playlist",
  "args": [
    "name",
    "false"
  ]
}
Next Playlist Item			{
  "command": "Next Playlist Item",
  "args": []
}
Outputs Off			{
  "command": "Outputs Off",
  "args": []
}
Outputs On			{
  "command": "Outputs On",
  "args": []
}
Overlay Model Clear		Model (name: 'Model',  type: 'multistring')	{
  "command": "Overlay Model Clear",
  "args": [
    "Model"
  ]
}
Overlay Model Effect		Models (name: 'Models',  type: 'multistring')
Auto Enable/Disable (name: 'AutoEnable',  type: 'string')
Effect (name: 'Effect',  type: 'subcommand')	{
  "command": "Overlay Model Effect",
  "args": [
    "Models",
    "Enabled",
    "Effect"
  ]
}
Overlay Model Fill		Model (name: 'Model',  type: 'multistring')
State (name: 'State',  type: 'string')
Color (name: 'Color',  type: 'color')	{
  "command": "Overlay Model Fill",
  "args": [
    "Model",
    "State",
    "#FF0000"
  ]
}
Overlay Model State		Model (name: 'Model',  type: 'multistring')
State (name: 'State',  type: 'string')	{
  "command": "Overlay Model State",
  "args": [
    "Model",
    "State"
  ]
}
Pause Playlist	If possible, pauses the currently running playlist. This command can not be run from inside a playlist		{
  "command": "Pause Playlist",
  "args": []
}
Play Media	Plays the media in the background	Media (name: 'media',  type: 'string')
Loop Count (name: 'loop',  type: 'int')
Volume Adjust (name: 'volume',  type: 'int')	{
  "command": "Play Media",
  "args": [
    "media",
    "1",
    "0"
  ]
}
Prev Playlist Item			{
  "command": "Prev Playlist Item",
  "args": []
}
Remote Effect Start	This command is deprecated and will be removed in FPP 10

Please use 'Effect Start' command with the Multisync checkbox
to select which remote to send it to
	Remote IP (name: 'remote',  type: 'datalist')
Effect Name (name: 'effect',  type: 'string')
Start Channel (name: 'startChannel',  type: 'int')
Loop Effect (name: 'loop',  type: 'bool')
Background (name: 'bg',  type: 'bool')	{
  "command": "Remote Effect Start",
  "args": [
    "Remote IP",
    "effect",
    "0",
    "true",
    "false"
  ]
}
Remote Effect Stop	This command is deprecated and will be removed in FPP 10

Please use 'Effect Stop' command with the Multisync checkbox
to select which remote to send it to
	Remote IP (name: 'remote',  type: 'datalist')
Effect Name (name: 'effect',  type: 'string')	{
  "command": "Remote Effect Stop",
  "args": [
    "Remote IP",
    "effect"
  ]
}
Remote FSEQ Effect Start	This command is deprecated and will be removed in FPP 10

Please use 'FSEQ Effect Start' command with the Multisync checkbox
to select which remote to send it to
	Remote IP (name: 'remote',  type: 'datalist')
FSEQ Name (name: 'fseq',  type: 'string')
Loop Effect (name: 'loop',  type: 'bool')
Background (name: 'bg',  type: 'bool')	{
  "command": "Remote FSEQ Effect Start",
  "args": [
    "Remote IP",
    "fseq",
    "true",
    "false"
  ]
}
Remote Playlist Start	This command is deprecated and will be removed in FPP 10

Please use 'Start Playlist' command with the Multisync checkbox
to select which remote to send it to
	Remote IP (name: 'remote',  type: 'datalist')
Playlist Name (name: 'playlist',  type: 'string')
Loop Effect (name: 'loop',  type: 'bool')
If Not Running (name: 'ifNotRunning',  type: 'bool')	{
  "command": "Remote Playlist Start",
  "args": [
    "Remote IP",
    "playlist",
    "true",
    "false"
  ]
}
Remote Run Script	This command is deprecated and will be removed in FPP 10

Please use 'Run Script' command with the Multisync checkbox
to select which remote to send it to
	Remote IP (name: 'remote',  type: 'datalist')
Script Name (name: 'script',  type: 'string')
Script Arguments (name: 'args',  type: 'string')
Environment Variables (name: 'env',  type: 'string')	{
  "command": "Remote Run Script",
  "args": [
    "Remote IP",
    "script",
    "args",
    "env"
  ]
}
Remote Trigger Command Preset	This command is deprecated and will be removed in FPP 10

Please use 'Trigger Command Preset' command with the Multisync checkbox
to select which remote to send it to
	Remote IP (name: 'remote',  type: 'datalist')
Preset Name (name: 'name',  type: 'string')	{
  "command": "Remote Trigger Command Preset",
  "args": [
    "Remote IP",
    "name"
  ]
}
Remote Trigger Command Preset Slot	This command is deprecated and will be removed in FPP 10

Please use 'Trigger Command Preset Slot' command with the Multisync checkbox
to select which remote to send it to
	Remote IP (name: 'remote',  type: 'datalist')
Preset Slot (name: 'slot',  type: 'int')	{
  "command": "Remote Trigger Command Preset Slot",
  "args": [
    "Remote IP",
    "0"
  ]
}
Restart Playlist Item			{
  "command": "Restart Playlist Item",
  "args": []
}
Resume Playlist			{
  "command": "Resume Playlist",
  "args": []
}
Run Script		Script Name (name: 'script',  type: 'string')
Script Arguments (name: 'args',  type: 'string')
Environment Variables (name: 'env',  type: 'string')	{
  "command": "Run Script",
  "args": [
    "script",
    "args",
    "env"
  ]
}
Start Next Scheduled Item			{
  "command": "Start Next Scheduled Item",
  "args": []
}
Start Playlist		Playlist Name (name: 'name',  type: 'string')
Repeat (name: 'repeat',  type: 'bool')
If Not Running (name: 'ifNotRunning',  type: 'bool')	{
  "command": "Start Playlist",
  "args": [
    "name",
    "false",
    "false"
  ]
}
Start Playlist At Item		Playlist Name (name: 'name',  type: 'string')
Item Index (name: 'item',  type: 'int')
Repeat (name: 'repeat',  type: 'bool')
If Not Running (name: 'ifNotRunning',  type: 'bool')	{
  "command": "Start Playlist At Item",
  "args": [
    "name",
    "0",
    "false",
    "false"
  ]
}
Start Playlist At Random Item		Playlist Name (name: 'name',  type: 'string')
Repeat (name: 'repeat',  type: 'bool')
If Not Running (name: 'ifNotRunning',  type: 'bool')	{
  "command": "Start Playlist At Random Item",
  "args": [
    "name",
    "false",
    "false"
  ]
}
Stop All Media	Stops all running media was was created via a Command		{
  "command": "Stop All Media",
  "args": []
}
Stop Gracefully		After Loop (name: 'loop',  type: 'bool')	{
  "command": "Stop Gracefully",
  "args": [
    "false"
  ]
}
Stop Media	Stops the media in the background started via a command	Media (name: 'media',  type: 'string')	{
  "command": "Stop Media",
  "args": [
    "media"
  ]
}
Stop Now			{
  "command": "Stop Now",
  "args": []
}
Switch To Player Mode	Restart FPP in Player Mode.		{
  "command": "Switch To Player Mode",
  "args": []
}
Switch To Remote Mode	Restart FPP in Remote Mode.		{
  "command": "Switch To Remote Mode",
  "args": []
}
Test Start		Update Interval (ms) (name: 'UpdateInterval',  type: 'int')
Test Pattern (name: 'TestPattern',  type: 'subcommand')	{
  "command": "Test Start",
  "args": [
    "1000",
    "TestPattern"
  ]
}
Test Stop			{
  "command": "Test Stop",
  "args": []
}
Toggle Playlist		Playlist Name (name: 'name',  type: 'string')
Repeat (name: 'repeat',  type: 'bool')
Stop Type (name: 'stop',  type: 'string')	{
  "command": "Toggle Playlist",
  "args": [
    "name",
    "false",
    "Gracefully"
  ]
}
Trigger Command Preset		Preset Name (name: 'name',  type: 'datalist')	{
  "command": "Trigger Command Preset",
  "args": [
    "Preset Name"
  ]
}
Trigger Command Preset In Future		Identifier (name: 'id',  type: 'string')
MS In Future (name: 'ms',  type: 'int')
Preset Name (name: 'name',  type: 'datalist')	{
  "command": "Trigger Command Preset In Future",
  "args": [
    "id",
    "0",
    "Preset Name"
  ]
}
Trigger Command Preset Slot		Preset Slot (name: 'slot',  type: 'int')	{
  "command": "Trigger Command Preset Slot",
  "args": [
    "0"
  ]
}
Trigger Multiple Command Preset Slots		Preset Slot A (name: 'SlotA',  type: 'int')
Preset Slot B (name: 'SlotB',  type: 'int')
Preset Slot C (name: 'SlotC',  type: 'int')
Preset Slot D (name: 'SlotD',  type: 'int')	{
  "command": "Trigger Multiple Command Preset Slots",
  "args": [
    "0",
    "0",
    "0",
    "0"
  ]
}
Trigger Multiple Command Presets		Preset Name 1 (name: 'NameA',  type: 'datalist')
Preset Name 2 (name: 'NameB',  type: 'datalist')
Preset Name 3 (name: 'NameC',  type: 'datalist')
Preset Name 4 (name: 'NameD',  type: 'datalist')
Preset Name 5 (name: 'NameE',  type: 'datalist')
Preset Name 6 (name: 'NameF',  type: 'datalist')	{
  "command": "Trigger Multiple Command Presets",
  "args": [
    "Preset Name 1",
    "Preset Name 2",
    "Preset Name 3",
    "Preset Name 4",
    "Preset Name 5",
    "Preset Name 6"
  ]
}
URL		URL (name: 'name',  type: 'string')
Method (name: 'method',  type: 'string')
Post Data (name: 'data',  type: 'string')	{
  "command": "URL",
  "args": [
    "name",
    "GET",
    "data"
  ]
}
Volume Adjust	Adjust volume either up or down by the given amount. (-100 - 100)	Volume (name: 'volume',  type: 'int')	{
  "command": "Volume Adjust",
  "args": [
    "0"
  ]
}
Volume Decrease	Decreases the volume by the given amount (0 - 100)	Volume (name: 'volume',  type: 'int')	{
  "command": "Volume Decrease",
  "args": [
    "0"
  ]
}
Volume Increase	Increases the volume by the given amount (0 - 100)	Volume (name: 'volume',  type: 'int')	{
  "command": "Volume Increase",
  "args": [
    "0"
  ]
}
Volume Set	Sets the volume to the specific value. (0 - 100)	Volume (name: 'volume',  type: 'int')	{
  "command": "Volume Set",
  "args": [
    "70"
  ]
}

