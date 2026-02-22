<!DOCTYPE html>
<html>
<head>
    <?php include 'includes_top.php'; ?>
</head>
<body data-layout="detached">
<div id="loading">
    <div class="loader"
        <img src="<?=base_url('assets/practice_ui/loading.gif')?>">
    </div>
</div>

<!-- HEADER -->
<?php include $page_name.'.php';?>
<script type="text/javascript">
    $(window).on('load', function () {
        hide_loading();
    })
    function show_loading(){
        $('#loading').show();
    }
    function hide_loading(){
        $('#loading').hide();
    }
</script>
<!-- all the js files -->
<?php include 'includes_bottom.php'; ?>
</body>
</html>
