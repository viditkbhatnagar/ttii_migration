<!DOCTYPE html>
<html>
<head>
    <?php include 'header.php'; ?>
</head>
<body data-layout="detached">
    <div id="loading">
        <div class="loader"></div>
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
    <?php include 'footer.php'; ?>
</body>
</html>
