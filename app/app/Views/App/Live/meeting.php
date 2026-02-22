<!DOCTYPE html>

<head>
    <title><?=get_settings('system_title')?></title>
    <meta charset="utf-8" />
    <link type="text/css" rel="stylesheet" href="https://source.zoom.us/3.5.2/css/bootstrap.css" />
    <link type="text/css" rel="stylesheet" href="https://source.zoom.us/3.5.2/css/react-select.css" />
    <meta name="format-detection" content="telephone=no">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <meta http-equiv="origin-trial" content="">
</head>

<body>
    
<script src="https://source.zoom.us/3.5.2/lib/vendor/react.min.js"></script>
<script src="https://source.zoom.us/3.5.2/lib/vendor/react-dom.min.js"></script>
<script src="https://source.zoom.us/3.5.2/lib/vendor/redux.min.js"></script>
<script src="https://source.zoom.us/3.5.2/lib/vendor/redux-thunk.min.js"></script>
<script src="https://source.zoom.us/3.5.2/lib/vendor/lodash.min.js"></script>
<script src="https://source.zoom.us/zoom-meeting-3.5.2.min.js"></script>
<script src="<?=base_url('assets/zoom_cdn/js/tool.js?v=3.5.2')?>"></script>

    <?php include_once 'meeting_settings.php'?>

</body>

</html>