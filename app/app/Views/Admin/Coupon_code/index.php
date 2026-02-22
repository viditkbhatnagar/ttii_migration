<style>
    .slide-container {
        position: relative;
        display: inline-block;
        width: 60px;
        height: 34px;
    }

    .slide {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        border-radius: 34px;
        transition: .4s;
    }

    .slide:before {
        position: absolute;
        content: "";
        height: 26px;
        width: 26px;
        left: 4px;
        bottom: 4px;
        background-color: white;
        border-radius: 50%;
        transition: .4s;
    }

    input:checked + .slide {
        background-color: #2196F3;
    }

    input:checked + .slide:before {
        transform: translateX(26px);
    }

    /* Rounded sliders */
    .slide.round {
        border-radius: 34px;
    }

    .slide.round:before {
        border-radius: 50%;
    }
</style>
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('admin/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
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
                        <h5 class="card-title mb-0"><?=$page_title ?? ''?></h5>
                    </div>
                    <div class="col-4">
                        <button class="btn btn-md btn-primary float-end"
                                onclick="show_ajax_modal('<?=base_url('admin/coupon_code/ajax_add/')?>', 'Add Coupon')">
                            <i class="mdi mdi-plus"></i>
                            Add <?=$page_title ?? ''?>
                        </button>
                    </div>
                </div>


            </div>
            <div class="card-body">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 150px;">Package</th>
                        <th style="width: 150px;">User</th>
                        <th style="width: 150px;">Price</th>
                        <th style="width: 150px;">Discount</th>
                        <th style="width: 150px;">Coupon Code</th>
                        <th style="width: 150px;">Validity</th>
                        <th style="width: 100px;">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                   
                        if (isset($list_items)){
                            foreach ($list_items as $key => $list_item){?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td><?=$list_item['package']?></td>
                                    <td><?=$list_item['name']==0 ? 'All User' : $list_item['name']?></td>
                                    <td><?=$list_item['amount']?></td>
                                    <td><?=$list_item['discount_perc']?></td>
                                    <td><?=$list_item['code']?></td>
                                    <td>
                                      <label class="slide-container">
                                          <input type="checkbox" class="mx-2 mt-2" value="1" <?=($list_item['validity']==1) ? 'checked' : ''?> onchange="get_status(this.value,<?=$list_item['id']?>)">
                                          <span class="slide round"></span>
                                      </label>
                                    </td>
                                    <td>
                                        <div class="dropdown d-inline-block">
                                            <button class="btn btn-soft-secondary btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="ri-more-fill align-middle"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                <!--<li>-->
                                                <!--    <a href="javascript::void()" class="dropdown-item" onclick="show_small_modal('<?=base_url('admin/coupon_code/ajax_view/'.$list_item['id'])?>', 'View Batch')">-->
                                                <!--        <i class="ri-eye-fill align-bottom me-2 text-muted"></i> View-->
                                                <!--    </a>-->
                                                <!--</li>-->
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item edit-item-btn" onclick="show_ajax_modal('<?=base_url('admin/coupon_code/ajax_edit/'.$list_item['id'])?>', 'Update Coupon')">
                                                        <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('admin/coupon_code/delete/'.$list_item['id'])?>')">
                                                        <i class="ri-delete-bin-fill align-bottom me-2 text-muted"></i> Delete
                                                    </a>
                                                </li>
                                            </ul>
                                        </div>
                                    </td>
                                </tr>
                                <?php
                            }
                        }
                    ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div><!--end row-->
<script>
    function get_status(status, coupon_id) {
        var data = {
            status: status,
            coupon_id: coupon_id // Include coupon_id in the data object
        };

        $.ajax({
            type: "POST",
            url: '<?php echo base_url("Admin/Coupon_code/get_validty_check"); ?>',
            data: data,
            success: function(response) {
                // Handle success response if needed
                console.log("Status updated successfully.");
            },
            error: function(xhr, status, error) {
                // Handle error if needed
                console.error("Error updating status: " + error);
            }
        });
    }
</script>





