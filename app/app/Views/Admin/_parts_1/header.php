<!doctype html>
<html lang="en" data-layout="vertical" data-topbar="dark" data-sidebar="light" data-sidebar-size="lg" data-sidebar-image="none" data-preloader="disable">
<head>
    <meta charset="utf-8" />
    <title><?= get_site_title().' - '.$page_title?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta content="" name="description" />
    <meta content="Trogon" name="author" />
    <?php include_once __DIR__.'/header_includes.php'; ?>

</head>

<body>

<!-- Begin page -->
<div id="layout-wrapper">

    <?php include_once __DIR__.'/header_topbar.php'; ?>

    <!-- ========== App Menu ========== -->
    <?php include_once __DIR__.'/navigation.php'; ?>
    <!-- Left Sidebar End -->
    <!-- Vertical Overlay-->
    <div class="vertical-overlay"></div>

    <!-- ============================================================== -->
    <!-- Start right Content here -->
    <!-- ============================================================== -->
    <div class="main-content">
        <div class="page-content">
            <div class="container-fluid">
