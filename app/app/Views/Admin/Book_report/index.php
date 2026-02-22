<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?= $page_title ?? '' ?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?= base_url('admin/dashboard/index') ?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?= $page_title ?? '' ?></li>
                </ol>
            </div>
        </div>
    </div>
</div>
<div class="row">

    <div class="col-lg-12">
        <div class="card">
            <div class="card-header">
                <div class="row">
                    <div class="col-8">
                        <h5 class="card-title mb-0"><?= $page_title ?? '' ?></h5>
                    </div>
                    
                </div>
            </div>
            <div class="card-body">
                <div class="rows">
                    <form method="get" action="">
                        <div class="row g-3">
                            <div class="col-xxl-2 col-sm-4 align-items-center">
                                <select class="form-control select2" name="status" id="status">
                                    <option value="all" <?= (isset($_GET['status'])) ? 'selected' : '' ?>>All Books</option>
                                    <option value="available" <?= (isset($_GET['status']) && $_GET['status'] == 'available') ? 'selected' : '' ?>>Available</option>
                                    <option value="unavailable" <?= (isset($_GET['status']) && $_GET['status'] == 'unavailable') ? 'selected' : '' ?>>Unavailable</option>
                                </select>
                            </div>
                            
                            <div class="col-12 col-md-2 col-xxl-1">
                                <button type="submit" class="btn btn-primary w-100 ">
                                    <i class="ri-equalizer-fill align-bottom"></i> Apply
                                </button>
                            </div>
                            <div class="col-12 col-md-2 col-xxl-1">
                                <a href="<?= base_url('admin/book_report/index') ?>" class="btn btn-danger w-100">
                                    <i class="ri-brush-fill align-bottom"></i> Clear
                                </a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>


        <div class="card p-3 overflow-auto">

            <table class="data_table_basic table table-borderless table-nowrap bg-white rounded">
                <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 150px;">Title</th>
                        <th style="width: 120px;">Author</th>
                        <th style="width: 120px;">Description</th>
                        <th style="width: 120px;">Cover Image</th>
                        <th style="width: 120px;">Chapters</th>
                        <th style="width: 120px;">Status</th>
                    </tr>
                    </thead>
                <tbody>
                    <?php
                        if (isset($list_items)){

                            foreach ($list_items as $key => $list_item){
                                ?>
                                <tr>
                                    <td><?= $key + 1 ?></td>
                                    <td><?= $list_item['title'] ?></td>
                                    <td><?= $list_item['author'] ?></td>
                                    <td><?= $list_item['description'] ?></td>
                                    <td> 
                                        <?php
                                            if(!empty($list_item['cover_image']))
                                            { ?>
                                                <img src="<?= base_url(get_file($list_item['cover_image'])) ?>" class="img-thumbnail" alt="cover image" style="max-width: 50px;">
                                            <?php
                                            }
                                        ?>
                                    </td>
                                    <td> 
                                        <a class="btn btn-sm btn-primary rounded-pill" href="<?=base_url('admin/books/chapters/'.$list_item['book_id'])?>">
                                           Chapters
                                        </a>
                                    </td>
                                    <td><?= $list_item['status'] ?></td>

                                    
                                </tr>
                                <?php
                            }
                        }
                    ?>
                    </tbody>
            </table>

        </div>

    </div>
</div><!--end row-->

<style>
    .badge {
        color: white;
        /* White text */
        padding: 0.25em 0.4em;
        /* Padding around the badge */
        font-size: 75%;
        /* Slightly smaller font size */
        font-weight: 700;
        /* Bold text */
        border-radius: 0.2rem;
        /* Rounded corners */
        text-align: center;
        /* Center the text */
        display: inline-block;
        /* Ensure the badge is inline */
        white-space: nowrap;
        /* Prevent text from wrapping */
        vertical-align: baseline;
        /* Align with baseline of text */
    }

    .badge1-success {
        background-color: #28a745;
    }

    .badge1-danger {
        background-color: #dc3545;
        /* Red background */
    }

    .badge1-warning {
        background-color: #ffff00;
        /* Yellow background */
    }

    .badge1-info {
        background-color: #0080f-f;
        /* Blue background */
    }
    
    .data_table_basic tbody tr:hover{
	    box-shadow: 0px 0px 10px rgba(0,0,0,0.1);
    }
</style>

<script>
    $(document).ready(function() {
        $('.select2').select2();
    });
</script>