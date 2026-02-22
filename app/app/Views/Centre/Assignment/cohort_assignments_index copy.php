
<div class="row">
    <div class="col-lg-12">
        <div class="card">
            <div class="card-header">
                <div class="row">
                    <div class="col-8">
                        <h5 class="card-title mb-0">Activities & Assignments</h5>
                    </div>
                    <div class="col-4">
                        <button class="btn btn-md btn-primary rounded-pill float-end"
                                onclick="show_ajax_modal('<?=base_url('admin/Cohorts/assignments_add/' . $edit_data['id']) ?>', 'Add Assignment')">
                            <i class="mdi mdi-plus"></i>
                            Add Assignment
                        </button>
                    </div>
                </div>


            </div>
            <div class="card-body">
                <table id="" class="data_table_basic table table-bordered  table-striped align-middle" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 150px;">Title</th>
                        <th style="width: 150px;">Description</th>
                        <th style="width: 180px;">Time</th>
                        <th style="width: 100px;">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                   
                        if (isset($assignments)){
                            foreach ($assignments as $key => $list_item){
                                
                                ?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td>
                                        <?php if (is_admin()) : ?>
                                            <?= esc($list_item['title']) ?>
                                            <br>
                                            <span style="font-style: italic; font-weight: 900; font-size: x-small;">
                                                Course: <?= esc($list_item['course_title']) ?>
                                            </span>
                                        <?php elseif (is_instructor()) : ?>
                                            <a href="<?= base_url('admin/assignment/show_submission/' . $list_item['id']) ?>">
                                                <?= esc($list_item['title']) ?>
                                                <br>
                                                <span style="font-style: italic; font-weight: 900; font-size: x-small;">
                                                    Course: <?= esc($list_item['course_title']) ?>
                                                </span>
                                            </a>
                                        <?php endif; ?>
                                    </td>

                                    <td><?=$list_item['description']?></td>
                                    <td>Date : <?=date('d M Y',strtotime($list_item['due_date']))?><br>
                                       <?= date('h:i A', strtotime($list_item['from_time'])) ?> to <?= date('h:i A', strtotime($list_item['to_time'])) ?>
                                    </td>
                                    <td>
                                        <div class="d-flex d-none">
                                            <button class="btn btn-outline-danger custom-rounded-40px-srs py-1 px-3" type="button" id="assignmentDeleteBtn" data-id="<?= $list_item['id'] ?>" data-cohort-id="<?= $list_item['cohort_id'] ?>">
                                                <i class="ri-delete-bin-fill fs-6"></i> Delete
                                            </button>
                                        </div>
                                        <div class="dropdown d-inline-block ">
                                            <button class="btn btn-soft-secondary btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="ri-more-fill align-middle"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                
                                                <li class="d-none">
                                                    <a href="javascript::void()" class="dropdown-item edit-item-btn d-none" onclick="show_ajax_modal('<?=base_url('admin/assignment/ajax_edit/'.$list_item['id'])?>', 'Update Assignment')">
                                                        <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('admin/assignment/delete/'.$list_item['id'])?>')">
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
    $(document).on("click", "#assignmentDeleteBtn", function (e) {
        e.preventDefault();
        console.log(10)
        const assignmentId = $(this).data("id");
        const cohortId = $(this).data("cohort-id");

        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: "<?= base_url('admin/assignment/delete') ?>",
                    type: "POST",
                    data: { id: assignmentId },
                    dataType: "json",
                    success: function (response) {
                        if (response.success) {
                            Swal.fire({
                                icon: "success",
                                title: "Deleted!",
                                text: response.message,
                                timer: 2000,
                                showConfirmButton: false
                            }).then(() => {
                                
                                const reload = '#pills-activities-info';
                                $.get("<?= base_url('admin/Cohorts/cohort_edit/') ?>" + cohortId, function (data) {
                                    let html = $('<div>').html(data);
                                    let newContent = html.find(reload).html();
                                    $(reload).html(newContent);
                                    $('html, body').animate({
                                        scrollTop: $('#pills-activities-info').offset().top - 100
                                    }, 800);
                                });
                                
                            });
                        } else {
                            Swal.fire({
                                icon: "error",
                                title: "Error!",
                                text: response.message || "Something went wrong!",
                            });
                        }
                    },
                    error: function () {
                        Swal.fire({
                            icon: "error",
                            title: "Error!",
                            text: "Failed to delete. Please try again.",
                        });
                    }
                });
            }
        });
    });
</script>




