
<div class="row">
    <div class="col-lg-12">
        <div class="card">
            <div class="card-header">
                <div class="row">
                    <div class="col-8">
                        <h5 class="card-title mb-0">Announcements</h5>
                    </div>
                    <div class="col-4">
                        <button class="btn btn-md btn-primary rounded-pill float-end"
                                onclick="show_ajax_modal('<?=base_url('centre/Cohorts/announcements_add/' . $edit_data['id']) ?>', 'Add Announcement')">
                            <i class="mdi mdi-plus"></i>
                            Add Announcement
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
                            <th style="width: 150px;">Content</th>
                            <th style="width: 150px;">Description</th>
                            <th style="width: 100px;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php
                   
                        if (isset($announcements)){
                            foreach ($announcements as $key => $list_item){
                                
                                ?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td><?=$list_item['title']?></td>
                                    <td><?=$list_item['content']?></td>
                                    <td><?=$list_item['description']?></td>
                                    <td>
                                        <div class="d-flex">
                                            <button class="btn btn-outline-danger custom-rounded-40px-srs py-1 px-3" type="button" id="announcementDeleteBtn" data-id="<?= $list_item['id'] ?>" data-cohort-id="<?= $list_item['cohort_id'] ?>">
                                                <i class="ri-delete-bin-fill fs-6"></i> Delete
                                            </button>
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
    $(document).on("click", "#announcementDeleteBtn", function (e) {
        e.preventDefault();
 
        const announcementId = $(this).data("id");
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
                    url: "<?= base_url('centre/Cohorts/delete_cohort_announcement') ?>",
                    type: "POST",
                    data: { id: announcementId },
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
                                
                                const reload = '#pills-announcements-info';
                                $.get("<?= base_url('centre/Cohorts/cohort_edit/') ?>" + cohortId, function (data) {
                                    let html = $('<div>').html(data);
                                    let newContent = html.find(reload).html();
                                    $(reload).html(newContent);
                                    $('html, body').animate({
                                        scrollTop: $('#pills-announcements-info').offset().top - 100
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




