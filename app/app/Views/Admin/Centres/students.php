<!-- Start page title -->
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
<!-- End page title -->

<div class="row">
    <div class="col-lg-12">
        <div class="card" id="centerList">
            <div class="card-header border-0">
                <div class="d-md-flex align-items-center">
                    <h5 class="card-title mb-3 mb-md-0 flex-grow-1"><?=$page_title ?? ''?></h5>
                    <div class="flex-shrink-0">
                        <div class="d-flex gap-1 flex-wrap">
                            <a href="<?=base_url('admin/centres/add')?>" class="btn btn-success">
                                <i class="ri-add-line align-bottom me-1"></i> Add Centre
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card-body pt-0">
                <div class="table-responsive table-card mb-1">
                    <table class="table table-nowrap align-middle" id="centerListTable">
                        <thead class="text-muted table-light">
                            <tr class="text-uppercase">
                                <th scope="col" style="width: 25px;">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="checkAll" value="option">
                                    </div>
                                </th>
                                <th style="width: 140px;">Centre ID</th>
                                <th>Centre Name</th>
                                <th>Contact Person</th>
                                <th>Contact No</th>
                                <th style="width: 100px;">Action</th>
                            </tr>
                        </thead>
                        <tbody class='form-check-all'>
                            <?php if (isset($list_items)) {
                                foreach ($list_items as $key => $list_item) { ?>
                                    <tr>
                                        <th scope="row">
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" name="checkAll" value="<?=$list_item['id']?>">
                                            </div>
                                        </th>
                                        <td><?=$list_item['centre_id']?></td>
                                        <td><?=$list_item['centre_name']?></td>
                                        <td><?=$list_item['contact_person']?></td>
                                        <td><?=$list_item['country_code']?> <?=$list_item['phone']?></td>
                                        <td>
                                            <ul class="list-inline hstack gap-2 mb-0">
                                                <li class="list-inline-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="View">
                                                    <a href="javascript:void(0)" onclick="show_small_modal('<?=base_url('admin/centres/view/'.$list_item['id'])?>', 'View Centre')" class="text-primary d-inline-block">
                                                        <i class="ri-eye-fill fs-16"></i>
                                                    </a>
                                                </li>
                                                <li class="list-inline-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="Edit">
                                                    <a href="javascript:void(0)" onclick="show_ajax_modal('<?=base_url('admin/centres/edit/'.$list_item['id'])?>', 'Update Centre')" class="text-primary d-inline-block edit-item-btn">
                                                        <i class="ri-pencil-fill fs-16"></i>
                                                    </a>
                                                </li>
                                                <li class="list-inline-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="Delete">
                                                    <a href="javascript:void(0)" onclick="delete_modal('<?=base_url('admin/centres/delete/'.$list_item['id'])?>')" class="text-danger d-inline-block remove-item-btn">
                                                        <i class="ri-delete-bin-5-fill fs-16"></i>
                                                    </a>
                                                </li>
                                            </ul>
                                        </td>
                                    </tr>
                            <?php }
                            } ?>
                        </tbody>
                    </table>
                    <div class="noresult" style="display: none;">
                        <div class="text-center">
                            <lord-icon src="https://cdn.lordicon.com/msoeawqm.json" trigger="loop" colors="primary:#405189,secondary:#0ab39c" style="width:75px;height:75px"></lord-icon>
                            <h5 class="mt-2">Sorry! No Result Found</h5>
                            <p class="text-muted">We've searched more than 150+ results but did not find any matches for your query.</p>
                        </div>
                    </div>
                </div>


            </div>
        </div>
    </div>
</div>

<script>
      var checkAll = document.getElementById("checkAll");
    if (checkAll) {
        checkAll.onclick = function () {
            var checkboxes = document.querySelectorAll('.form-check-all input[type="checkbox"]');
            var checkedCount = document.querySelectorAll('.form-check-all input[type="checkbox"]:checked').length;
            for (var i = 0; i < checkboxes.length; i++) {
                checkboxes[i].checked = this.checked;
                if (checkboxes[i].checked) {
                    checkboxes[i].closest("tr").classList.add("table-active");
                } else {
                    checkboxes[i].closest("tr").classList.remove("table-active");
                }
            }
    
            (checkedCount > 0) ? document.getElementById("remove-actions").style.display = 'none' : document.getElementById("remove-actions").style.display = 'block';
        };
    }
    
    
    function ischeckboxcheck() {
        Array.from(document.getElementsByName("checkAll")).forEach(function (x) {
            x.addEventListener("change", function (e) {
                if (x.checked == true) {
                    e.target.closest("tr").classList.add("table-active");
                } else {
                    e.target.closest("tr").classList.remove("table-active");
                }
    
                var checkedCount = document.querySelectorAll('[name="checkAll"]:checked').length;
                if (e.target.closest("tr").classList.contains("table-active")) {
                    (checkedCount > 0) ? document.getElementById("remove-actions").style.display = 'block': document.getElementById("remove-actions").style.display = 'none';
                } else {
                    (checkedCount > 0) ? document.getElementById("remove-actions").style.display = 'block': document.getElementById("remove-actions").style.display = 'none';
                }
            });
        });
    }
</script>
