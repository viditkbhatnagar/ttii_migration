<form action="<?= base_url('admin/student_fee/add/'.$id) ?>" method="post">
    <div class="row">

    <!-- Course Info Section -->
        <div class="col-12 mb-3">
            <div class="d-flex justify-content-between align-items-center p-3 border rounded bg-light">
                <div>
                    <h6 class="mb-1 text-muted">Total Course Amount</h6>
                    <h4 class="text-primary m-0" id="total_amount">₹ </h4>
                </div>
                <div>
                    <h6 class="mb-1 text-muted">Discounted Price</h6>
                    <h4 class="text-primary m-0" id="discounted_price">₹ </h4>
                </div>
                <div>
                    <h6 class="mb-1 text-muted">Unassigned Installment Amount</h6>
                    <h4 class="text-danger m-0" id="unassigned_amount">₹ </h4>
                </div>
            </div>
        </div>
        <div class="col-12 col-md-6">
            <div class="form-group">
                <label for="installment_details" class="form-label">Installment Details</label>
                <input type="text" class="form-control" id="installment_details" name="installment_details" required >
            </div>
        </div>

        <div class="col-12 col-md-6">
            <div class="form-group">
                <label for="course" class="form-label">Enrolled Course</label>
                <select class="form-control" id="course_id" name="course_id" required>
                    <option value="">Select Course</option>
                    <?php foreach ($courses as $course) : ?>
                        <option value="<?= $course['id'] ?>"><?= $course['title'] ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
        </div>
        
        <div class="col-12 col-md-6">
            <div class="form-group">
                <label for="amount" class="form-label">Amount</label>
                <input type="number" class="form-control" id="amount" name="amount" placeholder="INR" required >
            </div>
        </div>

        <div class="col-12 col-md-6">
            <div class="form-group">
                <label for="due_date" class="form-label">Due Date</label>
                <input type="date" class="form-control" id="due_date" name="due_date" required >
            </div>
        </div>

        <div class="col-12 col-md-6">
            <div class="form-group">
                <label for="payment_mode" class="form-label">Mode of Payment</label>
                <select class="form-control" id="payment_mode" name="payment_mode" required>
                    <option value="">Select Mode</option>
                    <option value="Online">Online</option>
                    <option value="Cash" >Cash</option>
                    <option value="Cheque" >Cheque</option>
                </select>
            </div>
        </div>

        <div class="col-12 col-md-6">
            <div class="form-group">
                <label for="payment_to" class="form-label">Payment To</label>
                <select class="form-control" id="payment_to" name="payment_to" required>
                    <option value="">-- Select any --</option>
                    <option value="ttii">TTII</option>
                </select>
            </div>
        </div>

        <div class="col-12 col-md-6">
            <div class="form-group">
                <label for="status" class="form-label">Status</label>
                <select class="form-control" id="payment_status" name="status" required>
                    <option value="">Select Status</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <!--<option value="Due">Due</option>-->
                    <!--<option value="Over Due">Over Due</option>-->
                </select>
            </div>
        </div>

        <!-- Payment Date Field (Hidden by default) -->
        <div class="col-12 col-md-6" id="payment_date_div" style="display: none;">
            <div class="form-group">
                <label for="payment_date" class="form-label">Payment Date</label>
                <input type="date" class="form-control" id="payment_date" name="payment_date" value="" >
            </div>
        </div>
    <!--Course (Hidden by default) -->
        <!-- <div class="col-12 col-md-6" id="course_id" style="display: none;">
            <div class="form-group">
                <label for="course_id" class="form-label">Course id</label>
               <input type="hidden" name="course_id" value="</?= esc($course_id) ?>">
            </div>
        </div> -->

        <div class="col-12">
            <div class="text-end mt-3">
                <button type="submit" class="btn btn-success">
                    <i class="ri-check-fill me-1"></i>Save
                </button>
            </div>
        </div>
    </div>
</form>
<script>
    
    function togglePaymentDate() {
        let statusSelect = document.getElementById("payment_status");
        let paymentDateDiv = document.getElementById("payment_date_div");


        if (statusSelect.value === "Paid") {
            paymentDateDiv.style.display = "block";
        } else {
            paymentDateDiv.style.display = "none";
            document.getElementById("payment_date").value = ""; // clear if hidden
        }
    }

    // Initial check (useful for edit mode)
    

    // On change event
    statusSelect.addEventListener("change", togglePaymentDate);
</script>
<script>
    $(document).ready(function () {
        togglePaymentDate();
        $(document).off('change', '#payment_status'); // remove duplicate handlers
        $(document).on('change', '#payment_status', function () {
            togglePaymentDate();
        });
        $(document).off('change', '#course_id');   // remove duplicate handlers

        $(document).on('change', '#course_id', function () {

                let v = $(this).val();
                console.log("Selected:", v);


                updateUnassignedAmount(v);
            });
    });

    function updateUnassignedAmount(course_id) {

        console.log("In function, course_id =", course_id);
        let studentId = "<?= $student_id ?>"; // FIX THIS LINE

        $.ajax({
            url: `<?= base_url('admin/fee_management/get_user_course_amount') ?>/${course_id}/${studentId}`,
            type: "GET",
            dataType: "json",
            success: function (res) {
                
                    $("#unassigned_amount").text(`₹ ${res.not_added_amount}`);
                    $("#discounted_price").text(`₹ ${res.discounted_price}`);
                    $("#total_amount").text(`₹ ${res.total_course_amount}`);
                
                console.log("Response:", res);
            }
        });
    }

</script>